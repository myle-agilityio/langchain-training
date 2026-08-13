import { AIMessage, HumanMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { Command, END, type LangGraphRunnableConfig, type NodeError } from "@langchain/langgraph";

import { getModelForConfig, getPlainModelForConfig, MissingApiKeyError } from "@/config/model";
import { TOOL } from "@/constants/index";
import { currentDateLine, scopeCheckPrompt, SYSTEM_PROMPT } from "@/prompts/index";
import { executableTools, modelTools } from "@/tools/index";
import { ScopeCheckSchema } from "@/types/index";
import { findReplyCall } from "@/utils/index";

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

// Validates if the request is within scope before processing. Also the one place that checks
// for a visitor-supplied OpenAI key (BYOK — see config/model.ts) since every node downstream
// shares this same run's config and can assume the key already checked out.
export async function validateRequest(
  state: AgentStateShape,
  config: LangGraphRunnableConfig,
) {
  const last = state.messages[state.messages.length - 1];
  if (!HumanMessage.isInstance(last)) return { outOfScope: false };

  let scopedModel;
  try {
    scopedModel = getPlainModelForConfig(config);
  } catch (error) {
    if (!(error instanceof MissingApiKeyError)) throw error;
    return {
      outOfScope: true,
      messages: [
        new AIMessage({
          id: crypto.randomUUID(),
          content:
            "I don't have an OpenAI API key to work with yet — enter yours in the box on " +
            "screen, then try again.",
        }),
      ],
    };
  }

  const chain = scopeCheckPromptTemplate.pipe(scopedModel.withStructuredOutput(ScopeCheckSchema));
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

// Handles errors during email composition
export function composeEmailErrorHandler(state: AgentStateShape, error: NodeError) {
  console.error(`[compose_email] failed after retries: ${error.error.message}`);
  const call = findReplyCall(state.messages);
  return new Command({
    update: {
      messages: call
        ? [
            new ToolMessage({
              tool_call_id: call.id ?? "unknown",
              content:
                "Drafting failed unexpectedly. Tell the teacher in one short line that the draft " +
                "couldn't be prepared and to try again.",
            }),
          ]
        : [],
    },
    goto: END,
  });
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
  const bound = getModelForConfig(config).bindTools!([...modelTools, ...frontendTools(state)]);
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
  if (!AIMessage.isInstance(last)) return END;
  const calls = last.tool_calls ?? [];
  if (calls.some((c) => c.name === TOOL.REPLY_TO_EMAIL)) return "compose_email";
  if (calls.some((c) => EXECUTABLE_NAMES.has(c.name))) return "tools";
  return END;
}
