import {
  AIMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { END, type LangGraphRunnableConfig } from "@langchain/langgraph";

import { getModelWithConfig, getUserIdFromConfig } from "@/config";
import { TOOL } from "@repo/constants";
import { USER_MEMORY_KEY, userMemoryNamespace } from "@/constants";
import { getMemoryStore } from "@/db";
import { currentDateLine, SYSTEM_PROMPT } from "@/prompts";
import { executableTools, modelTools } from "@/tools";
import type { AgentStateShape, UserMemoryValue } from "@/types";
import { withNode } from "./withNode";

// A `tool` message must stay paired with the assistant message whose tool_calls it answers —
// OpenAI rejects a history that opens on an orphaned one. summarize's count-based cutoff can
// land inside that pair, so drop any leading tool messages the slice below exposed.
const dropLeadingOrphanToolMessages = (
  messages: BaseMessage[],
): BaseMessage[] => {
  const start = messages.findIndex((m) => !ToolMessage.isInstance(m));

  return start === -1 ? [] : messages.slice(start);
};

// Messages already folded into `summary` are excluded here — `state.messages` itself keeps
// everything so the UI still shows the full thread.
export const recentMessages = (state: AgentStateShape): BaseMessage[] =>
  dropLeadingOrphanToolMessages(
    state.messages.slice(state.summarizedCount ?? 0),
  );

// Formats UI context for the prompt
const renderFrontendContext = (state: AgentStateShape): string => {
  const entries = state.copilotkit?.context ?? [];

  if (entries.length === 0) {
    return "";
  }

  const lines = entries.map((e) => {
    const value =
      typeof e.value === "string" ? e.value : JSON.stringify(e.value);

    return `- ${e.description ? `${e.description}: ` : ""}${value}`;
  });

  return `\n\nContext from the app UI:\n${lines.join("\n")}`;
};

// Older turns folded away by summarize — "" once the thread is short enough not to need it.
const renderSummaryContext = (state: AgentStateShape): string => {
  return state.summary
    ? `\n\nSummary of earlier conversation:\n${state.summary}`
    : "";
};

// Durable facts the `memorize` node has collected about this visitor across every thread — ""
// until there's anything on file yet, or when no userId was forwarded to scope it by. Reads the
// PostgresStore directly, not config.store — see updateContactProfile.ts.
const renderUserMemoryContext = async (
  config: LangGraphRunnableConfig,
): Promise<string> => {
  const userId = getUserIdFromConfig(config);

  if (!userId) {
    return "";
  }

  const store = await getMemoryStore();
  const value = (await store.get(userMemoryNamespace(userId), USER_MEMORY_KEY))
    ?.value as UserMemoryValue | undefined;
  const facts = value?.facts ?? [];

  return facts.length > 0
    ? `\n\nWhat you already know about the teacher from earlier conversations:\n${facts.map((f) => `- ${f}`).join("\n")}`
    : "";
};

// Wraps frontend actions in OpenAI tool format
const frontendTools = (state: AgentStateShape) => {
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
};

// System prompt + message history, as a template rather than manual array-spreading — the
// placeholder marks exactly where state.messages goes, instead of `[new SystemMessage(...), ...]`.
const callModelPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    SYSTEM_PROMPT +
      "{dateLine}{userMemoryContext}{summaryContext}{frontendContext}",
  ],
  new MessagesPlaceholder("messages"),
]);

// Invokes model with system prompt, context, and available tools. Errors (missing/rejected key,
// rate limits) are handled once by withNode, not here.
export const callModel = withNode(
  "call_model",
  async (state: AgentStateShape, config: LangGraphRunnableConfig) => {
    const bound = getModelWithConfig(config).bindTools!([
      ...modelTools,
      ...frontendTools(state),
    ]);
    // config threaded through so token callbacks stream assistant text into the chat UI.
    const response = await callModelPrompt.pipe(bound).invoke(
      {
        dateLine: currentDateLine(),
        userMemoryContext: await renderUserMemoryContext(config),
        summaryContext: renderSummaryContext(state),
        frontendContext: renderFrontendContext(state),
        messages: recentMessages(state),
      },
      config,
    );

    return { messages: [response] };
  },
);

const EXECUTABLE_NAMES = new Set<string>(executableTools.map((t) => t.name));

// Routes tool calls to compose_email, tools, or memorize (the plain-answer end of the turn)
export const routeAfterModel = (state: { messages: BaseMessage[] }) => {
  const last = state.messages[state.messages.length - 1];

  if (!AIMessage.isInstance(last)) {
    return END;
  }

  const calls = last.tool_calls ?? [];

  if (calls.some((c) => c.name === TOOL.REPLY_TO_EMAIL)) {
    return "compose_email";
  }

  if (calls.some((c) => EXECUTABLE_NAMES.has(c.name))) {
    return "tools";
  }

  return "memorize";
};
