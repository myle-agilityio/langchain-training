import { RemoveMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { getPlainModelWithConfig, hidden } from "@/config";
import { summarizePrompt } from "@/prompts";
import type { AgentStateShape } from "@/types";
import { withNode } from "./withNode";

// Once the thread passes this many messages, fold the older ones into `summary` and drop them —
// keeps call_model's prompt bounded instead of growing with every turn.
const SUMMARY_TRIGGER_COUNT = 10;
const KEEP_RECENT_COUNT = 4;

// Runs after moderation, before call_model — a jailbreak check reads full history, but
// summarizing doesn't need to.
export const summarizeConversation = withNode(
  "summarize",
  async (state: AgentStateShape, config: LangGraphRunnableConfig) => {
    if (state.messages.length <= SUMMARY_TRIGGER_COUNT) {
      return {};
    }

    const toDrop = state.messages.slice(0, -KEEP_RECENT_COUNT);
    const existingSummary = state.summary ?? "";

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", summarizePrompt(existingSummary)],
      new MessagesPlaceholder("messages"),
    ]);
    // Hidden: this is bookkeeping, not a reply the teacher should see stream into chat.
    const response = await prompt
      .pipe(getPlainModelWithConfig(config))
      .invoke({ messages: toDrop }, hidden(config));

    return {
      summary: response.content as string,
      messages: toDrop.map((m) => new RemoveMessage({ id: m.id! })),
    };
  },
);
