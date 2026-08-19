import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { END, type LangGraphRunnableConfig } from "@langchain/langgraph";

import { getModelForConfig, MissingApiKeyError } from "@/config/model";
import { TOOL } from "@/constants/index";
import { currentDateLine, SYSTEM_PROMPT } from "@/prompts/index";
import { executableTools, modelTools } from "@/tools/index";
import type { AgentStateShape } from "@/types/index";

// Formats UI context for the prompt
function renderFrontendContext(state: AgentStateShape): string {
  const entries = state.copilotkit?.context ?? [];
  if (entries.length === 0) return "";
  const lines = entries.map((e) => {
    const value =
      typeof e.value === "string" ? e.value : JSON.stringify(e.value);
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

// Invokes model with system prompt, context, and available tools. Also the one place that
// checks for a visitor-supplied OpenAI key (BYOK — see config/model.ts).
export async function callModel(
  state: AgentStateShape,
  config: LangGraphRunnableConfig,
) {
  let model;
  try {
    model = getModelForConfig(config);
  } catch (error) {
    if (!(error instanceof MissingApiKeyError)) throw error;
    return {
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
  if (!AIMessage.isInstance(last)) return END;
  const calls = last.tool_calls ?? [];
  if (calls.some((c) => c.name === TOOL.REPLY_TO_EMAIL)) return "compose_email";
  if (calls.some((c) => EXECUTABLE_NAMES.has(c.name))) return "tools";
  return END;
}
