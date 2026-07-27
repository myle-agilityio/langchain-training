import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { END, type LangGraphRunnableConfig } from "@langchain/langgraph";

import { model, plainModel } from "../config/model.js";
import { TOOL } from "../constants/index.js";
import { currentDateLine, scopeCheckPrompt, SYSTEM_PROMPT } from "../prompts/index.js";
import { executableTools, modelTools } from "../tools/index.js";
import { ScopeCheckSchema } from "../types/index.js";

type CopilotKitEntry = { description?: string; value?: unknown };
type CopilotKitAction = { name: string; description?: string; parameters?: unknown };
type AgentStateShape = {
  messages: BaseMessage[];
  outOfScope?: boolean;
  copilotkit?: { context?: CopilotKitEntry[]; actions?: CopilotKitAction[] };
};

// validate_request — gate on the teacher's newest message before call_model spends a turn (and
// tool calls) on something this assistant can't do. Only judges when the run's latest message is
// a fresh human ask; a run that resumes mid tool-loop or post-interrupt ends in something else,
// so it passes through untouched rather than risk misjudging non-request input.
export async function validateRequest(state: AgentStateShape) {
  const last = state.messages[state.messages.length - 1];
  if (!HumanMessage.isInstance(last)) return { outOfScope: false };

  const request = typeof last.content === "string" ? last.content : JSON.stringify(last.content);
  const check = await plainModel.withStructuredOutput(ScopeCheckSchema).invoke(scopeCheckPrompt(request));

  if (check.inScope) return { outOfScope: false };
  return {
    outOfScope: true,
    messages: [new AIMessage(check.declineMessage ?? "I can't help with that request.")],
  };
}

export function afterValidate(state: AgentStateShape) {
  return state.outOfScope ? END : "call_model";
}

// Readables the UI registered with useAgentContext arrive in state.copilotkit.context.
function renderFrontendContext(state: AgentStateShape): string {
  const entries = state.copilotkit?.context ?? [];
  if (entries.length === 0) return "";
  const lines = entries.map((e) => {
    const value = typeof e.value === "string" ? e.value : JSON.stringify(e.value);
    return `- ${e.description ? `${e.description}: ` : ""}${value}`;
  });
  return `\n\nContext from the app UI:\n${lines.join("\n")}`;
}

// Frontend tools (toggleTheme, enableAppMode, ...) arrive as JSON-schema actions; wrap them
// in OpenAI tool format so bindTools accepts them alongside the backend tools.
function frontendTools(state: AgentStateShape) {
  return (state.copilotkit?.actions ?? []).map((a) =>
    "function" in a
      ? a
      : {
          type: "function" as const,
          function: {
            name: a.name,
            description: a.description ?? "",
            parameters: a.parameters ?? { type: "object", properties: {} },
          },
        },
  );
}

// The model node: system prompt + UI context, backend tools + frontend tools, one invoke.
export async function callModel(
  state: AgentStateShape,
  config: LangGraphRunnableConfig,
) {
  const prompt = SYSTEM_PROMPT + currentDateLine() + renderFrontendContext(state);
  const bound = model.bindTools!([...modelTools, ...frontendTools(state)]);
  // config threaded through so token callbacks stream assistant text into the chat UI.
  const response = await bound.invoke(
    [new SystemMessage(prompt), ...state.messages],
    config,
  );
  console.log("callModel response", response);
  return { messages: [response] };
}

const EXECUTABLE_NAMES = new Set<string>(executableTools.map((t) => t.name));

// reply_to_email → compose subgraph; backend tool → tools; frontend tool or no call → END
// (a run ending with a frontend tool call is how the browser knows to execute it).
export function routeAfterModel(state: { messages: BaseMessage[] }) {
  console.log("routeAfterModel", state.messages);
  const last = state.messages[state.messages.length - 1];
  if (!AIMessage.isInstance(last)) return END;
  const calls = last.tool_calls ?? [];
  if (calls.some((c) => c.name === TOOL.REPLY_TO_EMAIL)) return "compose_email";
  if (calls.some((c) => EXECUTABLE_NAMES.has(c.name))) return "tools";
  return END;
}
