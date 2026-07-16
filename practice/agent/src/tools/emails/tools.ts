import { z } from "zod";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { copilotKitInterrupt } from "@copilotkit/sdk-js/langgraph";

import { EmailSchema, EmailClassificationSchema, type Email } from "./schema.js";
import { searchKnowledgeBase } from "./knowledge-base.js";

const EmailsStateSchema = z.object({
  emails: z.array(EmailSchema),
});

export const get_emails = tool(
  (
    _input: Record<string, never>,
    runtime: ToolRuntime<typeof EmailsStateSchema>,
  ) => {
    return JSON.stringify(runtime.state.emails ?? []);
  },
  {
    name: "get_emails",
    description: "Get the current shared inbox (all emails and their status).",
    schema: z.object({}),
  },
);

// manage_emails deliberately cannot set "replied" or "bug_filed" — those statuses
// are only reachable via a future finalize tool that runs after human approval, so
// review stays structurally required instead of just prompted (see CLAUDE.md).
const ManageableStatusSchema = z.enum(["unread", "read"]);

const EmailPatchSchema = z.object({
  id: z.string().describe("id of the email to update"),
  status: ManageableStatusSchema.optional(),
  classification: EmailClassificationSchema.optional(),
});

// Patches: subject/body/from/receivedAt are inbox facts the model must never rewrite, so it can only patch the mutable
// status/classification fields by id instead of echoing the whole array back.
export const manage_emails = tool(
  (
    input: { patches: z.infer<typeof EmailPatchSchema>[] },
    runtime: ToolRuntime<typeof EmailsStateSchema>,
  ) => {
    const current = runtime.state.emails ?? [];
    const patchesById = new Map(input.patches.map((p) => [p.id, p]));

    const updated: Email[] = current.map((email) => {
      const patch = patchesById.get(email.id);
      if (!patch) return email;
      return {
        ...email,
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.classification ? { classification: patch.classification } : {}),
      };
    });

    return new Command({
      update: {
        emails: updated,
        messages: [
          new ToolMessage({
            content: `Updated ${input.patches.length} email(s).`,
            tool_call_id: runtime.toolCallId,
          }),
        ],
      },
    });
  },
  {
    name: "manage_emails",
    description:
      "Patch one or more emails in the shared inbox by id — mark read/unread and/or " +
      "record a classification. Cannot mark an email replied or bug_filed.",
    schema: z.object({ patches: z.array(EmailPatchSchema) }),
  },
);

// Pauses via copilotKitInterrupt (not LangChain's humanInTheLoopMiddleware) so the
// frontend's useHumanInTheLoop({ name: "compose_reply" }) can render a real card.
//
// copilotKitInterrupt's resume is NOT a true LangGraph Command-resume of this exact
// call site — CopilotKit's runtime answers it by starting a brand-new run with the
// answer spliced in as context, rather than replaying this function to completion.
// Verified empirically: code placed after copilotKitInterrupt() here never affected
// the persisted thread state. So this tool does the pause + returns the raw decision
// for the model's own conversational context ONLY; EmailReplyCard is the one that
// actually applies the state change, via agent.setState, when the human decides —
// the same frontend-mutates-shared-state pattern the todos demo already used.
export const compose_reply = tool(
  (
    input: { id: string; subject: string; body: string },
    runtime: ToolRuntime<typeof EmailsStateSchema>,
  ) => {
    const current = runtime.state.emails ?? [];
    if (!current.some((e) => e.id === input.id)) {
      return new ToolMessage({
        content: `No email with id ${input.id} — call get_emails first.`,
        tool_call_id: runtime.toolCallId,
      });
    }

    const { answer } = copilotKitInterrupt({
      action: "compose_reply",
      args: input,
    });

    return new ToolMessage({
      content:
        typeof answer === "string" ? answer : JSON.stringify(answer ?? {}),
      tool_call_id: runtime.toolCallId,
    });
  },
  {
    name: "compose_reply",
    description:
      "Draft a reply to an email by id. This pauses for human approval before " +
      "anything actually sends — call it as soon as the reply is ready, don't " +
      "ask the human separately first.",
    schema: z.object({
      id: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
  },
);

export const search_knowledge_base = tool(
  (input: { query: string }) => {
    return JSON.stringify(searchKnowledgeBase(input.query));
  },
  {
    name: "search_knowledge_base",
    description:
      "Search internal support articles for context relevant to an email (billing " +
      "policy, known bugs, feature availability, etc.) before drafting a reply.",
    schema: z.object({ query: z.string() }),
  },
);

// Convenience grouping — don't spread this into createAgent's `tools` array.
// TTools' const-generic inference needs each tool passed as a literal array
// element; spreading a pre-typed array widens it and createAgent's overloads
// stop resolving (see agent.ts, which lists the three tools individually).
export const email_tools = [
  get_emails,
  manage_emails,
  compose_reply,
  search_knowledge_base,
];
