import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { copilotkitMiddleware, CopilotKitStateSchema } from "@copilotkit/sdk-js/langgraph";
import { StateSchema } from "@langchain/langgraph";

import {
  get_emails,
  manage_emails,
  compose_reply,
  search_knowledge_base,
} from "./tools/emails/index.js";
import { generate_a2ui } from "./a2ui_dynamic_schema.js";

// `emails` intentionally isn't part of this state schema anymore — the inbox now
// lives in LangGraph's cross-thread Store (see tools/emails/store.ts) so it's
// common across every thread instead of forking a copy per checkpoint.
const AgentStateSchema = new StateSchema({
  ...(CopilotKitStateSchema.fields as Record<string, any>),
});

const model = new ChatOpenAI({
  model: "gpt-5.4",
  modelKwargs: { parallel_tool_calls: false },
});

export const graph = createAgent({
  model,
  tools: [
    get_emails,
    manage_emails,
    compose_reply,
    search_knowledge_base,
    generate_a2ui,
  ],
  middleware: [copilotkitMiddleware],
  stateSchema: AgentStateSchema,
  systemPrompt: `
    You are a support-inbox triage assistant. Keep responses to 1-2 sentences.

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
  `,
});
