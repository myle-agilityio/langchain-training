import { z } from "zod";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";

export const EmailClassificationSchema = z.object({
  intent: z.enum(["question", "bug", "billing", "feature", "complex"]),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  topic: z.string(),
  summary: z.string(),
});

export const EmailSchema = z.object({
  id: z.string(),
  fromName: z.string(),
  fromEmail: z.string(),
  subject: z.string(),
  body: z.string(),
  receivedAt: z.string(),
  status: z.enum(["unread", "read", "replied", "bug_filed"]),
  classification: EmailClassificationSchema.optional(),
  reply: z.string().optional(),
  bugTicketId: z.string().optional(),
});

export type Email = z.infer<typeof EmailSchema>;
export type EmailClassification = z.infer<typeof EmailClassificationSchema>;

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const SEED_EMAILS: Email[] = [
  {
    id: "email-1",
    fromName: "Sarah Chen",
    fromEmail: "sarah.chen@acme.io",
    subject: "Can't log in after password reset",
    body: "Hi, I reset my password an hour ago but I still can't log in — I get 'Invalid credentials' every time, even right after resetting it again. I have a client demo in an hour and need access urgently. Can someone help ASAP?",
    receivedAt: hoursAgo(0.5),
    status: "unread",
  },
  {
    id: "email-2",
    fromName: "Marcus Webb",
    fromEmail: "marcus@devtools.co",
    subject: "Question about API rate limits",
    body: "Hey team, quick question — what's the request-per-minute rate limit on the Pro plan, and does it apply per API key or per account? Trying to plan out a batch job. Thanks!",
    receivedAt: hoursAgo(2),
    status: "unread",
  },
  {
    id: "email-3",
    fromName: "Priya Iyer",
    fromEmail: "priya.iyer@northbridge.com",
    subject: "Double charged this month",
    body: "I just noticed two charges of $49 on my card this month instead of one. Can you check my billing history and refund the duplicate? This is the second time this has happened and it's pretty frustrating.",
    receivedAt: hoursAgo(4),
    status: "unread",
  },
  {
    id: "email-4",
    fromName: "Tom Nguyen",
    fromEmail: "tom.nguyen@studiolabs.app",
    subject: "Feature request: dark mode for the mobile app",
    body: "Loving the product so far! One thing that would make a big difference for me is a dark mode option in the mobile app — I use it a lot at night and the bright white screen is rough on the eyes. Any plans for this?",
    receivedAt: hoursAgo(20),
    status: "unread",
  },
  {
    id: "email-5",
    fromName: "Elena Rossi",
    fromEmail: "elena.rossi@meridiangroup.eu",
    subject: "Urgent: data export failing for entire team, blocking board meeting",
    body: "Every export our team starts (CSV and PDF) has been failing silently since this morning — the job just disappears from the queue with no error. We need this data for a board meeting in a few hours. This is affecting our whole workspace, please escalate.",
    receivedAt: hoursAgo(1),
    status: "unread",
  },
  {
    id: "email-6",
    fromName: "Jamal Fischer",
    fromEmail: "jamal.fischer@brightpath.io",
    subject: "Webhook deliveries silently stopped this week",
    body: "We rely on your webhooks to sync order status into our warehouse system, and we noticed today that no events have arrived since Tuesday. No errors in our logs, they just stopped. Can someone check if something changed on your end? This is starting to cause fulfillment delays.",
    receivedAt: hoursAgo(6),
    status: "unread",
  },
  {
    id: "email-7",
    fromName: "Hannah Osei",
    fromEmail: "hannah.osei@lumenworks.co",
    subject: "Do you offer a discount for annual billing?",
    body: "We're currently on the monthly Pro plan and considering switching to annual. Is there a discount for paying yearly, and if so, how do we make the switch without losing our current billing cycle credit?",
    receivedAt: hoursAgo(8),
    status: "unread",
  },
  {
    id: "email-8",
    fromName: "Diego Martins",
    fromEmail: "diego.martins@vertexlabs.dev",
    subject: "Feature request: bulk CSV import for contacts",
    body: "Right now I have to add contacts one at a time, which is painful for our list of ~2,000. A bulk CSV import option would save us hours every month. Is this on the roadmap at all?",
    receivedAt: hoursAgo(15),
    status: "unread",
  },
  {
    id: "email-9",
    fromName: "Fatima Al-Sayed",
    fromEmail: "fatima.alsayed@northgatepartners.com",
    subject: "Dashboard charts showing wrong numbers vs. CSV export",
    body: "The revenue chart on our main dashboard shows $128k for last month, but when I export the same period as CSV and sum it myself I get $142k. This discrepancy is making it hard to trust the dashboard for reporting. Can someone look into this?",
    receivedAt: hoursAgo(3),
    status: "unread",
  },
  {
    id: "email-10",
    fromName: "Noah Bergström",
    fromEmail: "noah.bergstrom@arcticloop.se",
    subject: "Can we get SSO / SAML support?",
    body: "Our security team is requiring SSO for all vendor tools before we can roll this out company-wide. Do you support SAML-based single sign-on, or is it on your roadmap? This is currently the main blocker for us expanding our usage.",
    receivedAt: hoursAgo(26),
    status: "unread",
  },
];

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

const KNOWLEDGE_BASE: { topic: string; snippet: string }[] = [
  {
    topic: "password",
    snippet:
      "Reset password via Settings > Security > Change Password. The reset link expires after 30 minutes.",
  },
  {
    topic: "login",
    snippet:
      "If login still fails right after a password reset, the old session may be cached -- have the user sign out everywhere via Settings > Security > Sign out everywhere, then retry.",
  },
  {
    topic: "rate limit",
    snippet:
      "Pro plan: 600 requests/minute per API key (not per account). Current usage is returned on every response via the X-RateLimit-Remaining header.",
  },
  {
    topic: "billing",
    snippet:
      "Duplicate-looking charges are usually a pending authorization hold that clears in 3-5 business days. Confirmed duplicate charges can be refunded from the Billing admin panel.",
  },
  {
    topic: "export",
    snippet:
      "Data exports run as an async job. Silent failures are almost always caused by the export exceeding the 5GB single-file limit -- ask the user to chunk the export by date range.",
  },
  {
    topic: "dark mode",
    snippet: "Dark mode for the mobile app is on the roadmap (tracked as FEAT-482); no committed release date yet.",
  },
];

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

export const email_tools = [manage_emails, finalize_email, get_emails, search_knowledge_base];
