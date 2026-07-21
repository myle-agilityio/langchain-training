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

// `emails` intentionally isn't part of this state schema — the inbox lives in LangGraph's
// cross-thread Store (see tools/emails/store.ts) so it's common across every thread instead
// of forking a copy per checkpoint.
const AgentStateSchema = new StateSchema({
  ...CopilotKitStateSchema.fields,
});

const model = new ChatOpenAI({
  model: "gpt-5.4",
  modelKwargs: { parallel_tool_calls: false },
});

const tools = [
  get_emails,
  manage_emails,
  compose_reply,
  search_knowledge_base,
  generate_a2ui,
];

const SYSTEM_PROMPT = `
  You are a support-inbox triage assistant. Answers render as markdown in a narrow chat
  sidebar, so format for scanning, not prose:

  - Prose answers: 1-2 short sentences, no preamble.
  - Anything covering more than one email: a markdown bullet list, one email per bullet,
    never a run-on sentence with semicolons. Bold the sender name, then an em dash, then a
    single clause on what they need — e.g. "- **Leanna Rutherford** — asking whether offline
    mode for the Mac app is planned". At most one line per bullet.
  - Lead with the count when you're listing ("6 unread:"), then the list. Don't repeat the
    list back as a summary sentence afterwards.

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
  .addNode("call_model", createCallModel({ model, tools, systemPrompt: SYSTEM_PROMPT }))
  .addNode("tools", new ToolNode(tools))
  .addNode("finalize", restoreFrontendToolCalls)
  .addEdge(START, "prepare_context")
  .addEdge("prepare_context", "call_model")
  .addConditionalEdges("call_model", routeAfterModel, ["tools", "finalize"])
  .addEdge("tools", "call_model")
  .addEdge("finalize", END)
  .compile();
