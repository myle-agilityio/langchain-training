import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { logError, logInfo } from "@/logging/index";
import { errorNotice, threadIdOf } from "@/utils/index";

// The one try/catch every node runs behind. Retryable failures are rethrown so the graph's
// retryPolicy still applies; a terminal expected failure ends the turn with chat text the
// teacher can act on instead of a dead run.
export const withNode = <S, R>(
  name: string,
  run: (state: S, config: LangGraphRunnableConfig) => Promise<R>,
  // Extra state written alongside the notice when a node ends on an error (moderator sets
  // blocked, so the failed turn doesn't fall through into call_model and fail twice).
  terminalUpdate: Record<string, unknown> = {},
) => {
  return async (state: S, config: LangGraphRunnableConfig) => {
    const startedAt = Date.now();
    const threadId = threadIdOf(config);
    try {
      const result = await run(state, config);
      logInfo("node.ok", {
        node: name,
        threadId,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      const appError = logError(error, {
        node: name,
        threadId,
        durationMs: Date.now() - startedAt,
      });
      if (appError.retryable) throw appError;
      return { ...terminalUpdate, messages: errorNotice(appError) };
    }
  };
};
