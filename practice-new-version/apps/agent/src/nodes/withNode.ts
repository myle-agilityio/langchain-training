import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { logError, logInfo } from "@/logging";
import { threadIdOf } from "@/utils";

// The one try/catch every node runs behind: log success/failure, then always rethrow. Every
// failure gets the same `retryPolicy` (maxAttempts: 3) and, once that's exhausted,
// `nodeErrorHandler` ends the turn with chat text — no per-error distinction.
export const withNode = <S, R>(
  name: string,
  run: (state: S, config: LangGraphRunnableConfig) => Promise<R>,
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

      throw appError;
    }
  };
};
