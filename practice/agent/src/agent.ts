import { ChatOpenAI } from "@langchain/openai";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { CopilotKitStateSchema } from "@copilotkit/sdk-js/langgraph";
import { StateSchema, StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import {
  get_emails,
  manage_emails,
  compose_reply,
  search_knowledge_base,
} from "./tools/emails/index.js";
import { generate_a2ui } from "./a2ui_dynamic_schema.js";
import {
  prepareContext,
  createCallModel,
  restoreFrontendToolCalls,
} from "./copilotkit-bridge.js";
import {
  HistoryMemorySchema,
  WorkingContextSchema,
  buildModelMessages,
  createSummarizeHistory,
  renderHistorySummary,
  renderWorkingContext,
  trackWorkingContext,
} from "./memory/index.js";

// `emails` intentionally isn't part of this state schema — the inbox lives in LangGraph's
// cross-thread Store (see tools/emails/store.ts) so it's common across every thread instead
// of forking a copy per checkpoint. The two memory fields are the opposite case: per-thread
// on purpose, since two threads can be triaging two different emails.
const AgentStateSchema = new StateSchema({
  ...CopilotKitStateSchema.fields,
  historyMemory: HistoryMemorySchema,
  workingContext: WorkingContextSchema,
});

const model = new ChatOpenAI({
  model: "gpt-5.4",
  modelKwargs: { parallel_tool_calls: false },
});

// Summarizing old turns is a mechanical rewrite, not triage reasoning — a smaller model is
// enough, and this call is on the critical path of every long-thread turn. gpt-4.1 is already
// the second model in this repo (generate_a2ui uses it).
const summarizerModel = new ChatOpenAI({ model: "gpt-4.1" });

const tools = [
  get_emails,
  manage_emails,
  compose_reply,
  search_knowledge_base,
  generate_a2ui,
];

// Presentation rules live in their own constant, separate from the triage/tool guidance
// below: they apply to every answer the agent gives, not just inbox listings, and keeping
// them apart means tuning how answers *look* can't accidentally change how the agent *acts*.
const RESPONSE_FORMAT = `
  Every answer renders as markdown. Format all of them for scanning:

  - Answer first. Short preamble, no restating the question,
    and no summary sentence repeating what you just listed.
  - Any answer covering more than one thing — emails, knowledge-base articles, options,
    actions you took — is a markdown bullet list, one item per line. Never a run-on
    sentence joined by semicolons.
  - Introduce a list with a count or a short label on its own line, e.g. "6 unread:". That
    line carries the count — don't also state it in a sentence above the list.
  - In a bullet, bold the identifying word, then an em dash, then one clause — one line per
    bullet: "- **Leanna Rutherford** — asking whether offline mode for the Mac app is
    planned". The bold part is what a human recognises the item by (sender name, subject,
    article title) — never a raw id; mention ids inline only when the user needs one.
  - Every bullet in a list is an item of that list, and every item matches the label: if the
    label says "2 urgent", each bullet under it is urgent. Anything that doesn't fit gets its
    own labelled list; caveats, totals and follow-ups go in a sentence after the list, never
    as a bullet inside it.
  - Single-fact and yes/no answers stay prose: 1-2 short sentences, no bullets.
  - After you change something, say what changed and what it is now, one line per email.
  - Use \`code\` formatting for ids, statuses and category values; quote subjects and other
    inbox values verbatim instead of paraphrasing them.
`;

const SYSTEM_PROMPT = `
  You are a support-inbox triage assistant.

  Response format:
${RESPONSE_FORMAT}
  The inbox is shared and can change between turns independently of this chat (the
  user reads/replies straight from the UI), so never answer a question about current
  counts/status/unread emails from an earlier get_emails result in this conversation —
  always call it again first.

  Tool guidance:
  - get_emails: call this to see the shared inbox before acting on it, and every time
    you're asked about its current state (counts, unread, status) — its result can be
    stale the moment something outside this chat changes it.
  - manage_emails: patch email(s) by id to mark read/unread and/or record a
    classification (category + urgency). It cannot mark an email replied or
    bug_filed.
  - search_knowledge_base: call before drafting a reply or answering a policy/
    feature question, to ground the response in real support articles instead
    of guessing.
  - compose_reply: call this as soon as a reply is ready to send. It pauses for
    human approval automatically — you don't need to ask permission yourself
    first, just call the tool.
  - Dashboards & rich UI: call generate_a2ui to create dashboard UIs with metrics,
    charts, tables, and cards, if asked for one. It handles rendering automatically.
`;

/**
 * Backend tool calls loop back through the model; anything else ends the run. Frontend tool
 * calls never reach here as tool calls — `call_model` (via CopilotKit's `afterModel`) has
 * already stripped them off the message and stashed them for `finalize` to restore, precisely
 * so this router sends the run to the browser instead of looking for a tool the graph
 * doesn't have.
 */
function routeAfterModel(state: { messages: BaseMessage[] }) {
  const last = state.messages[state.messages.length - 1];
  const hasBackendToolCalls =
    AIMessage.isInstance(last) && (last.tool_calls?.length ?? 0) > 0;
  return hasBackendToolCalls ? "tools" : "finalize";
}

// Phase 2: an explicit StateGraph rather than `createAgent`. Same ReAct shape, but each step
// is a node we own — which is what the rest of Phase 2 needs, since memory, guardrails and
// agent handoff are all "put another node in the loop" changes that `createAgent`'s single
// opaque agent node can't express.
//
// `handleToolErrors` stays on ToolNode's default (true): a bad tool call comes back as an
// error ToolMessage the model can recover from. It rethrows `GraphInterrupt`, so
// compose_reply's approval pause still propagates instead of being swallowed as an error.
export const graph = new StateGraph(AgentStateSchema)
  .addNode("prepare_context", prepareContext)
  // Summarizing costs an LLM call, so it sits outside the tool loop: once per user turn,
  // and a no-op entirely until the thread is actually long.
  .addNode("manage_memory", createSummarizeHistory({ model: summarizerModel }))
  .addNode(
    "call_model",
    createCallModel({
      model,
      tools,
      // Both blocks are rebuilt per call, so they always reflect the latest focus/draft/summary.
      systemPrompt: (state) =>
        SYSTEM_PROMPT +
        renderHistorySummary(state.historyMemory) +
        renderWorkingContext(state.workingContext),
      prepareMessages: buildModelMessages,
    }),
  )
  .addNode("track_context", trackWorkingContext)
  .addNode("tools", new ToolNode(tools))
  .addNode("finalize", restoreFrontendToolCalls)
  .addEdge(START, "prepare_context")
  .addEdge("prepare_context", "manage_memory")
  .addEdge("manage_memory", "call_model")
  // track_context sits between the model and the tools so a draft is recorded *before*
  // compose_reply's approval pause rather than after it (see memory/working-context.ts).
  .addEdge("call_model", "track_context")
  .addConditionalEdges("track_context", routeAfterModel, ["tools", "finalize"])
  .addEdge("tools", "call_model")
  .addEdge("finalize", END)
  .compile();
