import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { copilotkitCustomizeConfig } from "@copilotkit/sdk-js/langgraph";
import { z } from "zod";

import { getPlainModelForConfig } from "@/config/model";
import { CLASSIFY_CONCURRENCY, TOOL } from "@/constants/index";
import { getEmail, updateEmail } from "@/db/index";
import { AppError, ERROR_CODE, ERRORS } from "@/errors/index";
import { logError } from "@/logging/index";
import { classifyPrompt } from "@/prompts/index";
import { ClassificationSchema, type Classification } from "@/types/index";
import type { ToolError } from "@/types/toolResult";
import { threadIdOf } from "@/utils/index";
import { defineTool, toolError } from "./defineTool";

type ClassifyResult =
  | { id: string; ok: true; classification: Classification }
  | { id: string; ok: false; error: ToolError };

// Exported so graph nodes classify by calling this directly — invoking the tool from inside a
// node emits AG-UI TOOL_CALL events with no toolCallId, which kills the client event stream.
export const classifyEmail = async (
  id: string,
  config: LangGraphRunnableConfig,
): Promise<ClassifyResult> => {
  try {
    const email = await getEmail(id);
    if (!email) throw new AppError(ERROR_CODE.EMAIL_NOT_FOUND);
    // Internal per-email classifier call — hide its forced tool call from the chat UI.
    const classification = await getPlainModelForConfig(config)
      .withStructuredOutput(ClassificationSchema)
      .invoke(
        classifyPrompt(email),
        copilotkitCustomizeConfig(config, {
          emitMessages: false,
          emitToolCalls: false,
        }),
      );
    await updateEmail(id, { classification });
    return { id, ok: true, classification };
  } catch (error) {
    // Never throw — one bad email (rate limit, parse failure) shouldn't sink the whole batch.
    const appError = logError(error, {
      tool: TOOL.CLASSIFY_EMAILS,
      threadId: threadIdOf(config),
      detail: `email ${id}`,
    });
    return { id, ok: false, error: toolError(appError) };
  }
};

const classifyEmailsBatched = async (
  ids: string[],
  config: LangGraphRunnableConfig,
) => {
  const results: ClassifyResult[] = [];
  for (let i = 0; i < ids.length; i += CLASSIFY_CONCURRENCY) {
    const chunk = ids.slice(i, i + CLASSIFY_CONCURRENCY);
    results.push(
      ...(await Promise.all(chunk.map((id) => classifyEmail(id, config)))),
    );
  }
  return results;
};

// Classifies by reading each email's real content itself, so the caller only ever passes ids —
// never fields it might have guessed. One structured-output call per email, run in bounded-concurrency batches.
export const classify_emails = defineTool({
  run: async ({ ids }, config) => {
    const results = await classifyEmailsBatched(ids, config);
    const failed = results.filter((r) => !r.ok);
    return {
      results,
      note: "The inbox UI already shows these classification tags — don't list topic/course/workType/urgency per email in your reply, just confirm briefly.",
      // Per-item recovery comes from the catalog, so it can't drift from the single-email path.
      ...(failed.length
        ? { recovery: ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].recovery }
        : {}),
    };
  },
  name: TOOL.CLASSIFY_EMAILS,
  description:
    "Classify one or more emails by id — it reads each email's actual current subject/body " +
    "itself and writes topic/course/workType/urgency to the inbox; you never compute or pass " +
    "the classification. Ids must be real: call get_emails first if the teacher described the " +
    "emails rather than naming exact ids. Batch every email you're classifying into one call. " +
    "Use this for any request to classify, triage, or tag email(s) — even 'classify this one' " +
    "on a single email.",
  schema: z.object({ ids: z.array(z.string()) }),
});
