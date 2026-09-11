import { ChatPromptTemplate } from "@langchain/core/prompts";

import { getPlainModelWithApiKey } from "@/config";
import {
  MEMORY_CHECKPOINT_NAMESPACE,
  SIDE_TASK_MODEL,
  USER_MEMORY_KEY,
  USER_MEMORY_NAMESPACE,
} from "@/constants";
import { getMemoryStore, getThreadMessages } from "@/db";
import { logError } from "@/logging";
import { memoryExtractionPrompt } from "@/prompts";
import {
  MemoryExtractionSchema,
  type MemoryCheckpointValue,
  type UserMemoryValue,
} from "@/types";

interface AgentMessageLike {
  role?: string;
  content?: unknown;
}

// AG-UI message content is either a plain string or an array of parts (text/image, for
// attachments) — same shape apps/web/src/utils/messageText.ts reads, duplicated here since that
// util is frontend-only.
const textOf = (message: AgentMessageLike): string | undefined => {
  const { content } = message;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const part = content.find(
      (p) =>
        typeof p === "object" &&
        p !== null &&
        (p as { type?: unknown }).type === "text",
    ) as { text?: string } | undefined;

    return part?.text;
  }

  return undefined;
};

// Runs when the teacher abandons a thread for a new one (see apps/web's ThreadsList "New chat"
// and POST /api/threads/extract-memory), scanning whatever of that thread hasn't been checked yet
// for durable facts about the teacher and folding any new ones into USER_MEMORY_KEY — the same
// way update_contact_profile does for a single sender, but store-wide and automatic instead of
// gated behind an explicit "remember".
//
// Reads/writes the PostgresStore directly (getMemoryStore) rather than a LangGraphRunnableConfig
// — this runs from an HTTP route, outside any graph run, against the transcript already saved to
// Postgres by useSyncThreads (see db/threads.ts's getThreadMessages).
export const extractMemoryForThread = async (
  threadId: string,
  apiKey: string | undefined,
): Promise<void> => {
  if (!apiKey) {
    return;
  }

  const messages = ((await getThreadMessages(threadId)) ??
    []) as AgentMessageLike[];

  if (messages.length === 0) {
    return;
  }

  const store = await getMemoryStore();
  const checkpoint = (await store.get(MEMORY_CHECKPOINT_NAMESPACE, threadId))
    ?.value as MemoryCheckpointValue | undefined;
  const checkedCount = checkpoint?.checkedCount ?? 0;
  const toCheck = messages.slice(checkedCount);

  if (toCheck.length === 0) {
    return;
  }

  const lines = toCheck
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, text: textOf(m) }))
    .filter((m): m is { role: string; text: string } => Boolean(m.text));

  // Nothing but tool calls/attachments since the last check — advance the watermark anyway so
  // the next abandon doesn't re-scan the same empty stretch.
  if (lines.length === 0) {
    await store.put(MEMORY_CHECKPOINT_NAMESPACE, threadId, {
      checkedCount: messages.length,
    } satisfies MemoryCheckpointValue);

    return;
  }

  const existing = (await store.get(USER_MEMORY_NAMESPACE, USER_MEMORY_KEY))
    ?.value as UserMemoryValue | undefined;
  const existingFacts = existing?.facts ?? [];

  try {
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", memoryExtractionPrompt(existingFacts)],
      ["human", "{transcript}"],
    ]);
    const { facts } = await prompt
      .pipe(
        getPlainModelWithApiKey(apiKey, SIDE_TASK_MODEL).withStructuredOutput(
          MemoryExtractionSchema,
        ),
      )
      .invoke({
        transcript: lines.map((l) => `${l.role}: ${l.text}`).join("\n"),
      });

    if (facts.length > 0) {
      await store.put(USER_MEMORY_NAMESPACE, USER_MEMORY_KEY, {
        facts: [...new Set([...existingFacts, ...facts])],
      } satisfies UserMemoryValue);
    }

    await store.put(MEMORY_CHECKPOINT_NAMESPACE, threadId, {
      checkedCount: messages.length,
    } satisfies MemoryCheckpointValue);
  } catch (error) {
    // Best-effort bookkeeping triggered off a "New chat" click — never worth surfacing to the
    // teacher. The watermark is deliberately NOT advanced here, so the next abandon retries.
    logError(error, { node: "extract_memory", threadId });
  }
};
