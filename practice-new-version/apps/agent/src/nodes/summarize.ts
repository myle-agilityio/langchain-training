import { AIMessage, HumanMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import {
  Command,
  type LangGraphRunnableConfig,
  type NodeError,
} from "@langchain/langgraph";

import { getPlainModelWithConfig, hidden } from "@/config";
import { KEEP_RECENT_COUNT } from "@/constants";
import { summarizePrompt } from "@/prompts";
import type { AgentStateShape } from "@/types";
import { withNode } from "./withNode";

// Flattens messages into a plain "User: .../Assistant: ..." transcript. Drops
// tool messages and content-less AI turns (tool-call scaffolding)
const toTranscript = (messages: BaseMessage[]): string =>
  messages
    .filter(
      (m) =>
        HumanMessage.isInstance(m) ||
        (AIMessage.isInstance(m) &&
          typeof m.content === "string" &&
          m.content.trim() !== ""),
    )
    .map((m) => {
      const content =
        typeof m.content === "string" ? m.content : JSON.stringify(m.content);

      return `${HumanMessage.isInstance(m) ? "User" : "Assistant"}: ${content}`;
    })
    .join("\n");

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

    const transcript = toTranscript(toSummarize);

    // Skip summarize until there's actually a transcript to fold in
    if (!transcript) {
      return {};
    }

    const existingSummary = state.summary ?? "";

    // Hidden: this is bookkeeping, not a reply the teacher should see stream into chat.
    const response = await getPlainModelWithConfig(config).invoke(
      summarizePrompt(existingSummary, transcript),
      hidden(config),
    );

    return {
      summary: response.content as string,
      summarizedCount: nextSummarizedCount,
    };
  },
);

// If summarize fails, skip straight to call_model with the summary/messages left untouched
// (the old summary plus the full, uncondensed recent history call_model would use anyway).
export const summarizeErrorHandler = (
  _state: AgentStateShape,
  _error: NodeError,
) => new Command({ update: {}, goto: "call_model" });
