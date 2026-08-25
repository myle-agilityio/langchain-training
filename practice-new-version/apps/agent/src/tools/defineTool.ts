import { tool } from "@langchain/core/tools";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { z } from "zod";

import type { AppError } from "@/errors";
import { logError } from "@/logging";
import type { ToolEnvelope, ToolError } from "@/types/toolResult";
import { threadIdOf } from "@/utils";

export const toolError = (error: AppError): ToolError => ({
  code: error.code,
  message: error.userMessage,
  recovery: error.recovery,
});

interface ToolDefinition<S extends z.ZodTypeAny, T> {
  name: string;
  description: string;
  schema: S;
  run: (input: z.infer<S>, config: LangGraphRunnableConfig) => Promise<T>;
  // For a tool whose success payload is a wire format the client parses (A2UI): return it
  // unwrapped. Failures still come back as the standard envelope.
  passthrough?: boolean;
}

// The single try/catch for every tool: run() returns plain data, this wraps it in the envelope,
// logs any throw with the tool name, and hands the model a safe message plus its recovery line.
export const defineTool = <S extends z.ZodTypeAny, T>({
  name,
  description,
  schema,
  run,
  passthrough = false,
}: ToolDefinition<S, T>) => {
  return tool(
    async (input: z.infer<S>, config: LangGraphRunnableConfig) => {
      try {
        const data = await run(input, config);

        if (passthrough) {
          return data as string;
        }

        return JSON.stringify({ ok: true, data } satisfies ToolEnvelope<T>);
      } catch (error) {
        const appError = logError(error, {
          tool: name,
          threadId: threadIdOf(config),
        });

        return JSON.stringify({
          ok: false,
          error: toolError(appError),
        } satisfies ToolEnvelope<T>);
      }
    },
    { name, description, schema },
  );
};
