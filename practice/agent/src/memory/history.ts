import { z } from "zod";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { zodState } from "@copilotkit/sdk-js/langgraph";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

/**
 * Short-term memory, part 1: keeping a thread's history affordable to send to the model.
 *
 * The checkpointer already persists messages per thread — that part is free. The problem it
 * creates is size: the system prompt (correctly) orders `get_emails` on every question about
 * inbox state, and each call appends a full 14-email JSON dump *with bodies*. Measured on a
 * real 28-message thread: ~12k tokens, 98% of it tool results, three separate inbox dumps of
 * which only the newest was still true.
 *
 * Two mechanisms, both applied when building the model's input rather than by mutating
 * `state.messages`:
 *
 *  1. **Tombstoning** — every superseded `get_emails` result is replaced with a one-line
 *     marker. Stale *and* expensive, so there's nothing to lose by dropping the body.
 *  2. **Summarization** — once a thread gets long, its oldest turns are folded into a running
 *     summary (`summarizeHistory`) and dropped from the model's input from then on.
 *
 * Why not `RemoveMessage`, which is the usual LangGraph answer: CopilotKit renders the chat
 * transcript from the graph's message list, so deleting messages from state would erase the
 * user's visible conversation. Trimming at model-call time (LangGraph's `pre_model_hook`
 * pattern) gets the token saving with the scrollback intact.
 */

/** Summarize once a thread passes this many messages... */
const SUMMARIZE_WHEN_OVER = 20;
/** ...folding in everything except roughly this many recent messages. */
const KEEP_RECENT_MESSAGES = 12;
/** Tool results that go stale the moment anything else touches the inbox. */
const VOLATILE_TOOLS = new Set(["get_emails"]);
/** Tool output is truncated to this many chars before being fed to the summarizer. */
const SUMMARY_TOOL_EXCERPT = 200;

export const HistoryMemorySchema = zodState(
  z
    .object({
      /** Running summary of the turns already folded away. */
      summary: z.string().optional(),
      /**
       * How many leading messages the summary covers. A count rather than an id because
       * nothing is ever removed from `state.messages`, so leading indexes are stable.
       */
      summarizedCount: z.number().optional(),
    })
    .default(() => ({})),
);

export type HistoryMemory = z.infer<typeof HistoryMemorySchema>;

/** Renders the running summary as a system-prompt block. Empty when nothing is folded yet. */
export function renderHistorySummary(memory: HistoryMemory | undefined): string {
  if (!memory?.summary) return "";
  return [
    "",
    "  Earlier in this conversation (summarized, the messages themselves are no longer shown):",
    ...memory.summary.split("\n").map((line) => `  ${line}`),
    "",
  ].join("\n");
}

const isVolatileToolResult = (message: BaseMessage) =>
  ToolMessage.isInstance(message) && VOLATILE_TOOLS.has(message.name ?? "");

/**
 * Builds the message list for one model call: summarized prefix dropped, superseded inbox
 * dumps tombstoned.
 *
 * Tombstoning replaces the content in place rather than dropping the message, because a
 * ToolMessage is the required answer to an earlier AI tool call — removing it outright would
 * leave a dangling tool call and the provider would reject the request.
 */
export function buildModelMessages(state: {
  messages?: BaseMessage[];
  historyMemory?: HistoryMemory;
}): BaseMessage[] {
  const messages = state.messages ?? [];
  const summarizedCount = state.historyMemory?.summarizedCount ?? 0;

  const kept = messages.filter((message, index) => {
    if (index >= summarizedCount) return true;
    // System/developer messages survive the cut — CopilotKit's injected "App Context:"
    // message lives near the front of the thread and is still current.
    return SystemMessage.isInstance(message);
  });

  const newestVolatile = kept.reduce(
    (latest, message, index) => (isVolatileToolResult(message) ? index : latest),
    -1,
  );

  return kept.map((message, index) => {
    if (!isVolatileToolResult(message) || index === newestVolatile) return message;
    const tool = message as ToolMessage;
    return new ToolMessage({
      id: tool.id,
      tool_call_id: tool.tool_call_id,
      name: tool.name,
      content:
        "[superseded inbox snapshot — dropped to save context. Call get_emails " +
        "again for the current inbox.]",
    });
  });
}

const SUMMARY_INSTRUCTIONS = `
Summarize this portion of a support-inbox triage conversation so another assistant can pick it
up with no other context. Keep it under 150 words, as terse bullets, covering only:
- which emails were discussed, by sender and subject (include ids only if they were referred to)
- what was actually done (classifications set, statuses changed, replies approved or rejected)
- anything the user asked for in how replies are written (tone, length, things to avoid)
Omit pleasantries, omit inbox statistics, omit anything already undone or superseded.
`;

/** Renders messages for the summarizer, truncating tool output so it isn't re-read in full. */
function transcribe(messages: BaseMessage[]): string {
  return messages
    .map((message) => {
      const text =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);
      if (ToolMessage.isInstance(message)) {
        return `tool:${message.name}: ${text.slice(0, SUMMARY_TOOL_EXCERPT)}`;
      }
      if (AIMessage.isInstance(message)) {
        const calls = (message.tool_calls ?? [])
          .map((call) => `${call.name}(${JSON.stringify(call.args).slice(0, 200)})`)
          .join(", ");
        return `assistant: ${text}${calls ? ` [called ${calls}]` : ""}`;
      }
      return `${message.getType()}: ${text}`;
    })
    .join("\n");
}

/**
 * The cut has to land at the start of a turn: slicing mid-turn would separate an AI tool call
 * from its ToolMessage answer and the provider would reject the request. Searches backwards
 * from `target` for a human message, i.e. the first message of some turn.
 */
function findTurnBoundary(
  messages: BaseMessage[],
  target: number,
  floor: number,
): number {
  for (let i = Math.min(target, messages.length - 1); i > floor; i -= 1) {
    if (HumanMessage.isInstance(messages[i])) return i;
  }
  return -1;
}

/**
 * The `manage_memory` node. Runs once per user turn (before the model, outside the tool loop)
 * and does nothing at all until a thread is actually long — summarizing costs an LLM call, so
 * it shouldn't be on the critical path of a short conversation.
 */
export function createSummarizeHistory({ model }: { model: BaseChatModel }) {
  return async function summarizeHistory(
    state: { messages: BaseMessage[]; historyMemory?: HistoryMemory },
    config: LangGraphRunnableConfig,
  ) {
    const messages = state.messages ?? [];
    const alreadySummarized = state.historyMemory?.summarizedCount ?? 0;
    if (messages.length <= SUMMARIZE_WHEN_OVER) return {};

    const cut = findTurnBoundary(
      messages,
      messages.length - KEEP_RECENT_MESSAGES,
      alreadySummarized,
    );
    if (cut <= alreadySummarized) return {};

    const previous = state.historyMemory?.summary;
    const response = await model.invoke(
      [
        new SystemMessage(SUMMARY_INSTRUCTIONS),
        new HumanMessage(
          [
            previous ? `Summary so far:\n${previous}\n` : "",
            "New portion of the conversation to fold in:",
            transcribe(messages.slice(alreadySummarized, cut)),
          ]
            .filter(Boolean)
            .join("\n"),
        ),
      ],
      config,
    );

    const summary =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    return { historyMemory: { summary, summarizedCount: cut } };
  };
}
