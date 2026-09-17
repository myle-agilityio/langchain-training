import { AIMessage, HumanMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import {
  Command,
  type LangGraphRunnableConfig,
  type NodeError,
} from "@langchain/langgraph";

import { getPlainModelWithConfig, hidden } from "@/config";
import { SUMMARIZE_BATCH_USER_MESSAGES } from "@/constants";
import { summarizePrompt } from "@/prompts";
import type { AgentStateShape } from "@/types";
import { turnBoundaryAfterUserTurns } from "@/utils";
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

// Runs once the unsummarized tail passes SUMMARIZE_TRIGGER_PENDING_USER_MESSAGES — folds the
// oldest SUMMARIZE_BATCH_USER_MESSAGES pending turns into `summary` as one fixed batch, before
// call_model, so its prompt stays bounded. `messages` itself is never dropped — the UI still
// shows full history.
export const summarizeConversation = withNode(
  "summarize",
  async (state: AgentStateShape, config: LangGraphRunnableConfig) => {
    const summarizedCount = state.summarizedCount ?? 0;
    const nextSummarizedCount = turnBoundaryAfterUserTurns(
      state.messages,
      summarizedCount,
      SUMMARIZE_BATCH_USER_MESSAGES,
    );
    const toSummarize = state.messages.slice(
      summarizedCount,
      nextSummarizedCount,
    );

    const transcript = toTranscript(toSummarize);

    // Empty only when there's nothing pending left to fold (summarizedCount already caught up)
    // — a non-empty batch always opens on a HumanMessage, which toTranscript always keeps.
    if (!transcript) {
      return { summarizedCount: nextSummarizedCount };
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
