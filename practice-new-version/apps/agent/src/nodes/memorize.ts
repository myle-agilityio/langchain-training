import { HumanMessage, type BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  Command,
  END,
  type LangGraphRunnableConfig,
  type NodeError,
} from "@langchain/langgraph";

import { getPlainModelWithConfig, getUserIdFromConfig, hidden } from "@/config";
import { USER_MEMORY_KEY, userMemoryNamespace } from "@/constants";
import { getMemoryStore } from "@/db";
import { memoryExtractionPrompt } from "@/prompts";
import {
  MemoryExtractionSchema,
  type AgentStateShape,
  type UserMemoryValue,
} from "@/types";
import { toTranscript } from "./summarize";
import { withNode } from "./withNode";

// Runs once call_model gives its final answer for the turn (see routeAfterModel) — replaces the
// old extract-on-"New chat" flow: every turn is now checked for durable facts and saved right
// away, scoped to the visitor who sent it, instead of batching unswept messages on thread abandon.
const currentTurn = (messages: BaseMessage[]): BaseMessage[] => {
  let lastHumanIndex = -1;

  messages.forEach((m, i) => {
    if (HumanMessage.isInstance(m)) {
      lastHumanIndex = i;
    }
  });

  return lastHumanIndex === -1 ? [] : messages.slice(lastHumanIndex);
};

export const memorize = withNode(
  "memorize",
  async (state: AgentStateShape, config: LangGraphRunnableConfig) => {
    const userId = getUserIdFromConfig(config);

    if (!userId) {
      return {};
    }

    const transcript = toTranscript(currentTurn(state.messages));

    if (!transcript) {
      return {};
    }

    const namespace = userMemoryNamespace(userId);
    const store = await getMemoryStore();
    const existing = (await store.get(namespace, USER_MEMORY_KEY))?.value as
      UserMemoryValue | undefined;
    const existingFacts = existing?.facts ?? [];

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", memoryExtractionPrompt(existingFacts)],
      ["human", "{transcript}"],
    ]);
    // withStructuredOutput is a forced tool call — hide it, or the raw {facts} would stream to chat.
    const { facts } = await prompt
      .pipe(
        getPlainModelWithConfig(config).withStructuredOutput(
          MemoryExtractionSchema,
        ),
      )
      .invoke({ transcript }, hidden(config));

    if (facts.length > 0) {
      await store.put(namespace, USER_MEMORY_KEY, {
        facts: [...new Set([...existingFacts, ...facts])],
      } satisfies UserMemoryValue);
    }

    return {};
  },
);

// Best-effort bookkeeping after the teacher already has their answer — a failed extraction should
// never surface as a chat error, just end the turn like the plain "no tool calls" path would have.
export const memorizeErrorHandler = (
  _state: AgentStateShape,
  _error: NodeError,
) => new Command({ update: {}, goto: END });
