import axios from "axios";
import { Hono } from "hono";

import { GENERATE_TITLE_MODEL } from "@/config";
import { OPENAI_API_KEY_HEADER } from "@repo/constants";
import {
  listThreads,
  upsertThread,
  threadExists,
  renameThread,
  deleteThread,
} from "@/db";
import { AppError, ERROR_CODE } from "@/errors";
import { logWarn } from "@/logging";
import { titlePrompt } from "@/prompts";
import { requireUserId, validate } from "./middleware";
import {
  ListThreadsQuerySchema,
  RenameThreadBodySchema,
  SaveThreadBodySchema,
  ThreadIdQuerySchema,
  type ListThreadsQuery,
  type RenameThreadBody,
  type SaveThreadBody,
  type ThreadIdQuery,
} from "./schemas";
import type { AppEnv } from "./types";

// Best-effort: a title is a nice-to-have, so any failure falls back to a truncated first
// message rather than blocking thread creation — but it gets logged, not swallowed silently.
const generateTitle = async (
  firstMessage: string | undefined,
  apiKey: string | undefined,
  requestId: string,
): Promise<string | null> => {
  const text = firstMessage?.trim();

  if (!text) {
    return null;
  }

  const fallback = text.length > 60 ? `${text.slice(0, 60)}…` : text;

  if (!apiKey) {
    return fallback;
  }

  try {
    const { data } = await axios.post<{
      choices?: { message?: { content?: string } }[];
    }>(
      "https://api.openai.com/v1/chat/completions",
      {
        model: GENERATE_TITLE_MODEL,
        messages: [
          { role: "system", content: titlePrompt() },
          { role: "user", content: text },
        ],
        max_tokens: 20,
        temperature: 0.3,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );
    const generated = data.choices?.[0]?.message?.content
      ?.trim()
      .replace(/^["']|["']$/g, "");

    return generated || fallback;
  } catch (error) {
    logWarn("threads.title_fallback", {
      requestId,
      detail: error instanceof Error ? error.message : String(error),
    });

    return fallback;
  }
};

export const threadsApp = new Hono<AppEnv>();

// Every route below is scoped to the browser that created the thread — see useUserId in apps/web.
threadsApp.use("*", requireUserId);

threadsApp.get("/", validate("query", ListThreadsQuerySchema), async (c) => {
  const { limit, offset, search } = c.get("valid") as ListThreadsQuery;

  return c.json(await listThreads(limit, offset, c.get("userId"), search));
});

// Upsert: creates the row (title from firstMessage) on a thread's first touch, else just bumps
// updated_at — never clobbers an existing title (LLM-generated or teacher-renamed).
threadsApp.post("/", validate("json", SaveThreadBodySchema), async (c) => {
  const { id, firstMessage, content } = c.get("valid") as SaveThreadBody;

  const exists = await threadExists(id);
  // Visitor's own key (BYOK — see agent/src/config/model.ts) first; process.env.OPENAI_API_KEY
  // is only a leftover fallback for as long as it's still set on this deployment.
  const apiKey =
    c.req.header(OPENAI_API_KEY_HEADER) ?? process.env.OPENAI_API_KEY;
  // Only spend an LLM call the first time this thread is created, not on every touch.
  const title = exists
    ? null
    : await generateTitle(firstMessage, apiKey, c.get("requestId"));

  return c.json({
    thread: await upsertThread(
      id,
      c.get("userId"),
      title,
      content?.trim() || null,
    ),
  });
});

threadsApp.patch("/", validate("json", RenameThreadBodySchema), async (c) => {
  const { id, title } = c.get("valid") as RenameThreadBody;
  const thread = await renameThread(id, c.get("userId"), title);

  if (!thread) {
    throw new AppError(ERROR_CODE.THREAD_NOT_FOUND, {
      detail: `no thread with id ${id}`,
    });
  }

  return c.json({ thread });
});

threadsApp.delete("/", validate("query", ThreadIdQuerySchema), async (c) => {
  const { id } = c.get("valid") as ThreadIdQuery;

  await deleteThread(id, c.get("userId"));

  return c.json({ ok: true });
});
