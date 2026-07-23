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

// gpt-4o-mini everywhere, per the practice plan's recommendation. One constant rather than a
// literal per call site so the whole practice moves models in one edit.
const MODEL = "gpt-4o-mini";

const model = new ChatOpenAI({
  model: MODEL,
  modelKwargs: { parallel_tool_calls: false },
});

// Kept as its own instance even though it's the same model as the triage one: summarizing old
// turns is a mechanical rewrite on the critical path of every long-thread turn, so it's the
// first thing that would be pinned to something cheaper/faster if this ever needs tuning.
const summarizerModel = new ChatOpenAI({ model: MODEL });

const tools = [
  get_emails,
  manage_emails,
  compose_reply,
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

  Classification has four fields, all required together:
  - topic: why they wrote — question (stuck on the material), submission (turning work in),
    review_request (asking for feedback before it's graded), grade_dispute (contesting a mark
    already given), absence, scheduling, admin (staff/paperwork), or complex. Use complex only
    when an email genuinely spans several topics and picking one would lose something the
    teacher must act on.
  - course: math_11, math_12, or none. Infer it from the mathematics referenced — logarithms,
    trig identities, rational functions are Grade 11; limits, derivatives, related rates,
    optimization, integrals are Grade 12 — not just from an explicit grade mention.
  - workType: practice, exercise, homework, quiz, test, project, or none.
  - urgency: high if something is time-bound within ~48 hours or a relationship is at stake —
    a missed or imminent assessment, an absence affecting a class today, a hard administrative
    deadline, or an escalating parent. medium if it needs action this week. low if it's a
    general question with no deadline attached.

  Replies go to teenagers and their parents, so drafts should be warm, plain, and specific
  about next steps and dates. Never promise a grade change, a waived penalty, or a re-grade
  outcome in a draft — offer the process instead, and check the policy articles for what's
  actually allowed.

  Tool guidance:
  - get_emails: call this to see the shared inbox before acting on it, and every time
    you're asked about its current state (counts, unread, status) — its result can be
    stale the moment something outside this chat changes it.
  - manage_emails: patch email(s) by id to mark read/unread and/or record a classification.
    It cannot mark an email replied or flagged_for_followup.
  - search_knowledge_base: call before drafting a reply or answering a policy or curriculum
    question, to ground the response in the school's actual policies and the course notes
    instead of guessing. Deadlines, penalties, and makeup rules are never safe to invent.
  - compose_reply: call this as soon as a reply is ready to send. It pauses for
    human approval automatically — you don't need to ask permission yourself
    first, just call the tool. It requires the email to be classified already, so if it
    isn't, call manage_emails first — compose_reply will refuse otherwise.
    Never narrate work the user just watched you do, and never repeat content a card is
    already rendering.
  - remember_contact: call this when you learn something about a student, parent, or colleague
    that will still matter the next time they write in — which class and period they're in, an
    accommodation they have, an outcome already delivered (a makeup granted, a re-grade done),
    a promise made, or how the user wants replies to them written. Identify them with the id of
    one of their emails — never type an address yourself, call get_emails if you don't have the
    id. What you already know is given to you below; don't call it to re-save something already
    listed there, and don't use it for details of a single message or for anything the inbox
    itself records.
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
  // Long-term recall runs before the model so a profile is in the prompt for the draft this
  // turn produces, not the one after it (see memory/working-context.ts).
  .addNode("recall_memory", recallMemory)
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
  .addEdge("manage_memory", "recall_memory")
  .addEdge("recall_memory", "call_model")
  // track_context sits between the model and the tools so a draft is recorded *before*
  // compose_reply's approval pause rather than after it (see memory/working-context.ts).
  .addEdge("call_model", "track_context")
  .addConditionalEdges("track_context", routeAfterModel, ["tools", "finalize"])
  .addEdge("tools", "call_model")
  .addEdge("finalize", END)
  .compile();
