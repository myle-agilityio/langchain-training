import type { LangGraphRunnableConfig } from "@langchain/langgraph";

// The correlation id every agent-side log line carries. Doubles as the user key until real auth
// replaces copilotkit.ts's demo-user stub.
export const threadIdOf = (
  config?: LangGraphRunnableConfig,
): string | undefined => {
  const value = config?.configurable?.thread_id;

  return typeof value === "string" ? value : undefined;
};
