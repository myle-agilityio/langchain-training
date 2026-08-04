import { AIMessage, isAIMessage, isHumanMessage, type BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
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

// System prompt + full history, so "show me them"/"which one" resolve against prior turns
// instead of the scope check judging the latest message in isolation.
const scopeCheckPromptTemplate = ChatPromptTemplate.fromMessages([
  ["system", scopeCheckPrompt()],
  new MessagesPlaceholder("messages"),
]);

// Validates if the request is within scope before processing
export async function validateRequest(state: AgentStateShape) {
  const last = state.messages[state.messages.length - 1];
  if (!last || !isHumanMessage(last)) return { outOfScope: false };

  const chain = scopeCheckPromptTemplate.pipe(plainModel.withStructuredOutput(ScopeCheckSchema));
  const check = await chain.invoke({ messages: state.messages });

  if (check.inScope) return { outOfScope: false };
  return {
    outOfScope: true,
    messages: [
      new AIMessage({ id: crypto.randomUUID(), content: check.declineMessage ?? "I can't help with that request." }),
    ],
  };
}

// Routes to model or ends if out of scope
export function afterValidate(state: AgentStateShape) {
  return state.outOfScope ? END : "call_model";
}

// Formats UI context for the prompt
function renderFrontendContext(state: AgentStateShape): string {
  const entries = state.copilotkit?.context ?? [];
  if (entries.length === 0) return "";
  const lines = entries.map((e) => {
    const value = typeof e.value === "string" ? e.value : JSON.stringify(e.value);
    return `- ${e.description ? `${e.description}: ` : ""}${value}`;
  });
  return `\n\nContext from the app UI:\n${lines.join("\n")}`;
}

// Wraps frontend actions in OpenAI tool format
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

// System prompt + message history, as a template rather than manual array-spreading — the
// placeholder marks exactly where state.messages goes, instead of `[new SystemMessage(...), ...]`.
const callModelPrompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT + "{dateLine}{frontendContext}"],
  new MessagesPlaceholder("messages"),
]);

// Invokes model with system prompt, context, and available tools
export async function callModel(
  state: AgentStateShape,
  config: LangGraphRunnableConfig,
) {
  const bound = model.bindTools!([...modelTools, ...frontendTools(state)]);
  const chain = callModelPrompt.pipe(bound);
  // config threaded through so token callbacks stream assistant text into the chat UI.
  const response = await chain.invoke(
    {
      dateLine: currentDateLine(),
      frontendContext: renderFrontendContext(state),
      messages: state.messages,
    },
    config,
  );
  return { messages: [response] };
}

const EXECUTABLE_NAMES = new Set<string>(executableTools.map((t) => t.name));

// Routes tool calls to compose_email, tools, or END
export function routeAfterModel(state: { messages: BaseMessage[] }) {
  const last = state.messages[state.messages.length - 1];
  if (!last || !isAIMessage(last)) return END;
  const calls = last.tool_calls ?? [];
  if (calls.some((c) => c.name === TOOL.REPLY_TO_EMAIL)) return "compose_email";
  if (calls.some((c) => EXECUTABLE_NAMES.has(c.name))) return "tools";
  return END;
}
