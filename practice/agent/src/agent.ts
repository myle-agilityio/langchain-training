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
    You are the triage assistant for a high school mathematics teacher who teaches
    Grade 11 math (algebra 2 / precalculus) and Grade 12 math (calculus). Their inbox
    is students, parents, and school staff. Keep responses to 1-2 sentences.

    The inbox is shared and can change between turns independently of this chat (the
    user reads/replies straight from the UI), so never answer a question about current
    counts/status/unread emails from an earlier get_emails result in this conversation —
    always call it again first.

    Classification has four fields, all required together:
    - topic: why they wrote — question (stuck on the material), submission (turning work
      in), review_request (asking for feedback before it's graded), grade_dispute
      (contesting a mark already given), absence, scheduling, admin (staff/paperwork),
      or complex. Use complex only when an email genuinely spans several topics and
      picking one would lose something the teacher must act on.
    - course: math_11, math_12, or none. Infer it from the mathematics referenced —
      logarithms, trig identities, rational functions are Grade 11; limits, derivatives,
      related rates, optimization, integrals are Grade 12 — not just from an explicit
      grade mention.
    - workType: practice, exercise, homework, quiz, test, project, or none.
    - urgency: high if something is time-bound within ~48 hours or a relationship is at
      stake — a missed or imminent assessment, an absence affecting a class today, a
      hard administrative deadline, or an escalating parent. medium if it needs action
      this week. low if it's a general question with no deadline attached.

    Replies go to teenagers and their parents, so drafts should be warm, plain, and
    specific about next steps and dates. Never promise a grade change, a waived penalty,
    or a re-grade outcome in a draft — offer the process instead, and check the policy
    articles for what's actually allowed.

    Tool guidance:
    - get_emails: call this to see the shared inbox before acting on it, and every time
      you're asked about its current state (counts, unread, status) — its result can be
      stale the moment something outside this chat changes it.
    - manage_emails: patch email(s) by id to mark read/unread and/or record a
      classification. It cannot mark an email replied or flagged_for_followup.
    - search_knowledge_base: call before drafting a reply or answering a policy or
      curriculum question, to ground the response in the school's actual policies and
      the course notes instead of guessing. Deadlines, penalties, and makeup rules are
      never safe to invent.
    - compose_reply: call this as soon as a reply is ready to send. It pauses for
      human approval automatically — you don't need to ask permission yourself
      first, just call the tool.
    - Dashboards & rich UI: call generate_a2ui to create dashboard UIs with metrics,
      charts, tables, and cards, if asked for one. It handles rendering automatically.
  `,
});
