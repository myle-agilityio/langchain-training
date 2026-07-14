import { z } from "zod";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { EmailSchema, EmailClassificationSchema, type EmailClassification } from "./schema.js";
import { KNOWLEDGE_BASE } from "./knowledge-base.js";

const EmailsStateSchema = z.object({ emails: z.array(EmailSchema) });

export const manage_emails = tool(
  (
    input: { id: string; status?: "unread" | "read"; classification?: EmailClassification },
    runtime: ToolRuntime<typeof EmailsStateSchema>,
  ) => {
    const current = runtime.state.emails ?? [];
    const emails = current.map((email) =>
      email.id === input.id
        ? {
            ...email,
            ...(input.status ? { status: input.status } : {}),
            ...(input.classification ? { classification: input.classification } : {}),
          }
        : email,
    );

    return new Command({
      update: {
        emails,
        messages: [
          new ToolMessage({
            content: `Updated email ${input.id}`,
            tool_call_id: runtime.toolCallId,
          }),
        ],
      },
    });
  },
  {
    name: "manage_emails",
    description:
      "Update a single email: mark it as read, and/or attach a classification (intent, urgency, " +
      "topic, summary) after analyzing it. This tool cannot mark an email as replied or bug_filed " +
      "-- use finalize_email for that, and only after a human has approved.",
    schema: z.object({
      id: z.string(),
      status: z.enum(["unread", "read"]).optional(),
      classification: EmailClassificationSchema.optional(),
    }),
  },
);

export const search_knowledge_base = tool(
  (input: { query: string }) => {
    const q = input.query.toLowerCase();
    const hits = KNOWLEDGE_BASE.filter((doc) => q.includes(doc.topic) || doc.topic.includes(q));
    const results = (hits.length > 0 ? hits : KNOWLEDGE_BASE.slice(0, 2)).map((doc) => doc.snippet);
    return JSON.stringify(results);
  },
  {
    name: "search_knowledge_base",
    description:
      "Search internal docs for context relevant to a customer's question or feature request. " +
      "Call this before drafting a reply for 'question' or 'feature' intent emails.",
    schema: z.object({ query: z.string() }),
  },
);

export const finalize_email = tool(
  (
    input: {
      id: string;
      outcome: "replied" | "bug_filed";
      reply?: string;
      bugTicketId?: string;
    },
    runtime: ToolRuntime<typeof EmailsStateSchema>,
  ) => {
    const current = runtime.state.emails ?? [];
    const emails = current.map((email) => {
      if (email.id !== input.id) return email;
      // A bug ticket is the more significant outcome -- if this call carries a
      // bugTicketId (or the email is already bug_filed), the status stays
      // "bug_filed" even when a reply is recorded in the same or a later call.
      const status = input.outcome === "bug_filed" || email.status === "bug_filed" ? "bug_filed" : "replied";
      return {
        ...email,
        status: status as "bug_filed" | "replied",
        reply: input.reply ?? email.reply,
        bugTicketId: input.bugTicketId ?? email.bugTicketId,
      };
    });

    return new Command({
      update: {
        emails,
        messages: [
          new ToolMessage({
            content: `Recorded ${input.outcome} for email ${input.id}`,
            tool_call_id: runtime.toolCallId,
          }),
        ],
      },
    });
  },
  {
    name: "finalize_email",
    description:
      "Persist the outcome of an action onto an email in the shared inbox. For a bug ticket " +
      "approved via createBugTicket, call this ONCE with { outcome: 'bug_filed', bugTicketId, " +
      "reply } -- reply is a short notification you draft yourself and is sent directly, no " +
      "separate approval needed since the human already approved the bug ticket. For a normal " +
      "reply, call this with { outcome: 'replied', reply } immediately after composeReply " +
      "confirms the human approved it. Never call it speculatively or before that approval.",
    schema: z.object({
      id: z.string(),
      outcome: z.enum(["replied", "bug_filed"]),
      reply: z.string().optional(),
      bugTicketId: z.string().optional(),
    }),
  },
);

export const get_emails = tool(
  (_input: Record<string, never>, runtime: ToolRuntime<typeof EmailsStateSchema>) => {
    return JSON.stringify(runtime.state.emails ?? []);
  },
  {
    name: "get_emails",
    description: "Get the current inbox, including each email's status and any prior classification.",
    schema: z.object({}),
  },
);

export const email_tools = [manage_emails, finalize_email, get_emails, search_knowledge_base];
