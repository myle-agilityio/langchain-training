import { z } from "zod";
import { createAgent, humanInTheLoopMiddleware } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import {
  copilotkitMiddleware,
  CopilotKitStateSchema,
  zodState,
} from "@copilotkit/sdk-js/langgraph";
import { StateSchema } from "@langchain/langgraph";

import {
  EmailSchema,
  seedEmails,
  get_emails,
  manage_emails,
  compose_reply,
  search_knowledge_base,
} from "./tools/emails/index.js";
import { generate_a2ui } from "./a2ui_dynamic_schema.js";

const AgentStateSchema = new StateSchema({
  emails: zodState(z.array(EmailSchema).default(() => seedEmails)),
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
  middleware: [
    copilotkitMiddleware,
    humanInTheLoopMiddleware({
      interruptOn: {
        compose_reply: {
          allowedDecisions: ["approve", "edit", "reject"],
          description: (toolCall) =>
            `Send this reply?\n\nSubject: ${toolCall.args.subject}\n\n${toolCall.args.body}`,
        },
      },
    }),
  ],
  stateSchema: AgentStateSchema,
  systemPrompt: `
    You are a support-inbox triage assistant. Keep responses to 1-2 sentences.

    Tool guidance:
    - get_emails: call this to see the shared inbox before acting on it.
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
