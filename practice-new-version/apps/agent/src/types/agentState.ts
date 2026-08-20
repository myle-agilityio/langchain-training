import type { BaseMessage } from "@langchain/core/messages";

export type CopilotKitEntry = { description?: string; value?: unknown };
export type CopilotKitAction = {
  name: string;
  description?: string;
  parameters?: unknown;
};
export type AgentStateShape = {
  messages: BaseMessage[];
  blocked?: boolean;
  copilotkit?: { context?: CopilotKitEntry[]; actions?: CopilotKitAction[] };
};
