import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { getPlainModelWithConfig, hidden } from "@/config";
import { KEEP_RECENT_COUNT } from "@/constants";
import { summarizePrompt } from "@/prompts";
import type { AgentStateShape } from "@/types";
import { withNode } from "./withNode";

// Runs every turn once the thread is past SUMMARIZE_THRESHOLD — folds in only the messages that
// newly fell out of the KEEP_RECENT_COUNT window since the last run, before call_model, so its
// prompt stays bounded. `messages` itself is never dropped — the UI still shows full history.
export const summarizeConversation = withNode(
  "summarize",
  async (state: AgentStateShape, config: LangGraphRunnableConfig) => {
    const summarizedCount = state.summarizedCount ?? 0;
    const nextSummarizedCount = Math.max(
      state.messages.length - KEEP_RECENT_COUNT,
      summarizedCount,
    );
    const toSummarize = state.messages.slice(
      summarizedCount,
      nextSummarizedCount,
    );

    // Nothing new to fold in yet (e.g. the thread hasn't grown past the recent window).
    if (toSummarize.length === 0) {
      return {};
    }

    const existingSummary = state.summary ?? "";

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", summarizePrompt(existingSummary)],
      new MessagesPlaceholder("messages"),
    ]);
    // Hidden: this is bookkeeping, not a reply the teacher should see stream into chat.
    const response = await prompt
      .pipe(getPlainModelWithConfig(config))
      .invoke({ messages: toSummarize }, hidden(config));

    return {
      summary: response.content as string,
      summarizedCount: nextSummarizedCount,
    };
  },
);
