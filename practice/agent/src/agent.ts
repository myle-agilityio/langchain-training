import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { CopilotKitStateSchema } from "@copilotkit/sdk-js/langgraph";
import { StateSchema, StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { model, plainModel } from "./model.js";
import {
  get_emails,
  manage_emails,
  search_knowledge_base,
  CLASSIFICATION_GUIDE,
} from "./tools/emails/index.js";
import { generate_a2ui } from "./a2ui_dynamic_schema.js";
import { composeReplySubgraph, reply_to_email } from "./compose-reply/index.js";
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
  recallMemory,
  remember_contact,
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

// Tools the MODEL may call. reply_to_email is here so the model can request a reply, but it is
// deliberately absent from `executableTools` below: the router routes a reply_to_email call into
// the compose-reply subgraph instead of executing it as a plain tool.
const modelTools = [
  get_emails,
  manage_emails,
  search_knowledge_base,
  remember_contact,
  generate_a2ui,
  reply_to_email,
];

// Tools the ToolNode actually runs. Same set minus reply_to_email (handled by the subgraph).
const executableTools = [
  get_emails,
  manage_emails,
  search_knowledge_base,
  remember_contact,
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
    bullet: "- **Marcus Mohr** — asking you to check his working on the extra practice set
    before Friday's quiz". The bold part is what a human recognises the item by (sender name,
    subject, article title) — never a raw id; mention ids inline only when the user needs one.
  - Every bullet in a list is an item of that list, and every item matches the label: if the
    label says "2 urgent", each bullet under it is urgent. Anything that doesn't fit gets its
    own labelled list; caveats, totals and follow-ups go in a sentence after the list, never
    as a bullet inside it.
  - Single-fact and yes/no answers stay prose: 1-2 short sentences, no bullets.
  - After you change something, say what changed and what it is now, one line per email.
  - Use \`code\` formatting for ids, statuses and classification values (topic, course,
    workType); quote subjects and other inbox values verbatim instead of paraphrasing them.
  - Never narrate work the user just watched you do, and don't repeat content a card is already
    showing (a draft, a "Reply sent" confirmation) — one short line is enough.
`;

const SYSTEM_PROMPT = `
  You are the triage assistant for a high school mathematics teacher who teaches Grade 11
  math (algebra 2 / precalculus) and Grade 12 math (calculus). Their inbox is students,
  parents, and school staff.

  Response format:
${RESPONSE_FORMAT}
  The inbox is shared and can change between turns independently of this chat (the
  user reads/replies straight from the UI), so never answer a question about current
  counts/status/unread emails from an earlier get_emails result in this conversation —
  always call it again first.

  The context above may say which email the teacher currently has open in the inbox. When
  they say "this email", "this one", "reply this", "it", or similar without naming a person
  or subject, they mean that open email — act on its id directly instead of asking which one.
  (If the working-context block below already names a focused email, that takes precedence —
  it's the one you were just working on.) If no email is open and they haven't named one,
  then ask which.

  When you classify emails (e.g. "classify all unread"), fill all four fields together:
${CLASSIFICATION_GUIDE}

  Each tool's own description says when and how to use it; don't re-derive that here. The only
  thing to add: for remember_contact, what you already know about a contact is shown below —
  don't re-save anything already listed there.
`;

/**
 * Routes after the model. A `reply_to_email` call goes to the compose-reply subgraph; any other
 * backend tool call loops through the `tools` node; anything else ends the run. `reply_to_email`
 * is never executed as a plain tool — it's purely a signal to enter the subgraph.
 *
 * Frontend tool calls never reach here as tool calls: `call_model` (via CopilotKit's
 * `afterModel`) has already stripped them off and stashed them for `finalize` to restore, so
 * this router sends the run to the browser instead of looking for a tool the graph doesn't have.
 * With `parallel_tool_calls: false` the model makes at most one call per turn, so a
 * reply_to_email call never coexists with another backend tool call.
 */
function routeAfterModel(state: { messages: BaseMessage[] }) {
  const last = state.messages[state.messages.length - 1];
  if (!AIMessage.isInstance(last)) return "finalize";
  const calls = last.tool_calls ?? [];
  if (calls.some((c) => c.name === "reply_to_email")) return "compose_reply";
  return calls.length > 0 ? "tools" : "finalize";
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
  .addNode("manage_memory", createSummarizeHistory({ model: plainModel }))
  // Long-term recall runs before the model so a profile is in the prompt for the draft this
  // turn produces, not the one after it (see memory/working-context.ts).
  .addNode("recall_memory", recallMemory)
  .addNode(
    "call_model",
    createCallModel({
      model,
      tools: modelTools,
      // Both blocks are rebuilt per call, so they always reflect the latest focus/draft/summary.
      systemPrompt: (state) =>
        SYSTEM_PROMPT +
        renderHistorySummary(state.historyMemory) +
        renderWorkingContext(state.workingContext),
      prepareMessages: buildModelMessages,
    }),
  )
  .addNode("track_context", trackWorkingContext)
  .addNode("tools", new ToolNode(executableTools))
  // The compose-reply subgraph, composed directly as a node so its approval interrupt propagates
  // to this run (see compose-reply/index.ts). A reply_to_email call routes here instead of to
  // `tools`; the pipeline classifies, researches, drafts, and raises the interrupt.
  .addNode("compose_reply", composeReplySubgraph)
  .addNode("finalize", restoreFrontendToolCalls)
  .addEdge(START, "prepare_context")
  .addEdge("prepare_context", "manage_memory")
  .addEdge("manage_memory", "recall_memory")
  .addEdge("recall_memory", "call_model")
  // track_context sits between the model and the tools so a single-email focus is recorded
  // before any downstream step (see memory/working-context.ts).
  .addEdge("call_model", "track_context")
  .addConditionalEdges("track_context", routeAfterModel, [
    "tools",
    "compose_reply",
    "finalize",
  ])
  .addEdge("tools", "call_model")
  // On a successful draft the subgraph pauses at its interrupt, so this edge isn't traversed
  // until resume (a fresh CopilotKit run). It only fires when triage found no email — then the
  // subgraph END returns here with an error ToolMessage the model can react to.
  .addEdge("compose_reply", "call_model")
  .addEdge("finalize", END)
  .compile();
