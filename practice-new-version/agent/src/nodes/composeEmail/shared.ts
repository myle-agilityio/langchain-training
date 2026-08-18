import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { copilotkitCustomizeConfig } from "@copilotkit/sdk-js/langgraph";

import { getEmail } from "@/db/index";
import type { Email } from "@/types/index";

// These internal structured-output calls are classifier/drafting steps, not chat replies — hide
// their forced tool calls from the chat UI.
export const hidden = (config: LangGraphRunnableConfig) =>
  copilotkitCustomizeConfig(config, {
    emitMessages: false,
    emitToolCalls: false,
  });

// Nodes call db/rag functions directly, never tool.invoke() — a tool invoked inside a node emits
// AG-UI TOOL_CALL events with no toolCallId, which kills the client's event stream mid-run.
export async function fetchEmailById(id: string): Promise<Email | null> {
  return (await getEmail(id)) ?? null;
}
