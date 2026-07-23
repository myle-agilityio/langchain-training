import { z } from "zod";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { ToolMessage, AIMessage } from "@langchain/core/messages";
import { interrupt } from "@langchain/langgraph";

import { EmailClassificationSchema } from "./schema.js";
import { searchKnowledgeBase } from "./knowledge-base.js";
import { countsByStatus, findEmail, loadEmails, patchEmail } from "./store.js";

// These tools no longer take the LangGraph store from `runtime`: the inbox lives in Postgres
// and store.ts reaches it directly (see ../../db/index.ts).

export const get_emails = tool(
  async () => {
    const [emails, counts] = await Promise.all([loadEmails(), countsByStatus()]);
    return JSON.stringify({
      total: emails.length,
      countsByStatus: counts,
      emails,
    });
  },
  {
    name: "get_emails",
    description:
      "Get the teacher's current shared inbox: total count, a countsByStatus breakdown " +
      "(unread/read/replied/flagged_for_followup), and the full email list. For any question " +
      "about how many emails are unread/read/etc., use countsByStatus directly — " +
      "don't count entries in the emails array yourself.",
    schema: z.object({}),
  },
);

// manage_emails deliberately cannot set "replied" or "flagged_for_followup" — those
// statuses are only reachable via a future finalize tool that runs after human approval,
// so review stays structurally required instead of just prompted (see CLAUDE.md).
const ManageableStatusSchema = z.enum(["unread", "read"]);

const EmailPatchSchema = z.object({
  id: z.string().describe("id of the email to update"),
  status: ManageableStatusSchema.optional(),
  classification: EmailClassificationSchema.optional(),
});

// Patches: subject/body/from/receivedAt are inbox facts the model must never rewrite, so it can only patch the mutable
// status/classification fields by id instead of echoing the whole array back.
// classification is all-or-nothing (topic + course + workType + urgency together) — a
// partial classification would render as a half-filled badge row in the inbox UI.
export const manage_emails = tool(
  async (
    input: { patches: z.infer<typeof EmailPatchSchema>[] },
    runtime: ToolRuntime,
  ) => {
    const applied = await Promise.all(
      input.patches.map((patch) =>
        patchEmail(patch.id, {
          status: patch.status,
          classification: patch.classification,
        }),
      ),
    );

    // Report unknown ids rather than silently succeeding — the model hallucinating an id it
    // never read is exactly the case this catches.
    const missed = input.patches.filter((_, i) => !applied[i]).map((p) => p.id);
    return new ToolMessage({
      content: missed.length
        ? `Updated ${applied.filter(Boolean).length} email(s). No email found for: ${missed.join(", ")} — call get_emails for current ids.`
        : `Updated ${applied.length} email(s).`,
      tool_call_id: runtime.toolCallId,
    });
  },
  {
    name: "manage_emails",
    description:
      "Patch one or more emails in the shared inbox by id — mark read/unread and/or " +
      "record a classification (topic + course + workType + urgency). Cannot mark an " +
      "email replied or flagged_for_followup.",
    schema: z.object({ patches: z.array(EmailPatchSchema) }),
  },
);

// Pauses via LangGraph's raw `interrupt()` (not LangChain's humanInTheLoopMiddleware)
// so the frontend's useHumanInTheLoop({ name: "compose_reply" }) can render a real card.
//
// We deliberately do NOT use @copilotkit/sdk-js's `copilotKitInterrupt` helper: on
// langgraph 1.4.x, `interrupt()` PAUSES by throwing a `GraphInterrupt`, and that helper
// wraps the call in a try/catch that swallows it and rethrows as CopilotKitMisuseError
// ("Failed to create interrupt"), so the run errors instead of pausing (langgraph's own
// interrupt() docs warn: never catch it without rethrowing). Calling `interrupt()`
// directly lets the GraphInterrupt propagate, so the run interrupts cleanly. We replicate
// the helper's payload shape (__copilotkit_interrupt_value__ / __copilotkit_messages__) so
// the CopilotKit runtime + frontend still recognize it as a `compose_reply` action.
//
// The resume is NOT a true LangGraph Command-resume of this call site — CopilotKit answers
// it by starting a brand-new run with the answer spliced in as context, rather than
// replaying this function to completion. So this tool does the pause + returns the raw
// decision for the model's own conversational context ONLY; EmailReplyCard is the one that
// actually applies the state change — via a PATCH to /api/emails, which writes straight to
// the shared inbox store — the same frontend-mutates-shared-state pattern the todos demo used.
export const compose_reply = tool(
  async (
    input: { id: string; subject: string; body: string },
    runtime: ToolRuntime,
  ) => {
    const target = await findEmail(input.id);
    if (!target) {
      return new ToolMessage({
        content: `No email with id ${input.id} — call get_emails first.`,
        tool_call_id: runtime.toolCallId,
      });
    }

    // Triage before reply, enforced here rather than asked for in the prompt. Both the system
    // prompt and the "Ask AI to draft" message already say to classify first, and the model
    // skipped it anyway in 3 of 5 measured runs — classification is the one step that doesn't
    // visibly advance "draft a reply", so it's the one that gets dropped (made worse by
    // parallel_tool_calls: false, which turns this into four separate chances to shortcut).
    // Returning a corrective ToolMessage makes the model classify and call back, the same
    // self-correcting pattern as the unknown-id case above.
    if (!target.classification) {
      return new ToolMessage({
        content:
          `Email ${input.id} has no classification yet, and every email must be triaged ` +
          `before it's replied to. Call manage_emails to record its classification ` +
          `(topic + course + workType + urgency), then call compose_reply again with the ` +
          `same draft.`,
        tool_call_id: runtime.toolCallId,
      });
    }

    const response = interrupt({
      __copilotkit_interrupt_value__: { action: "compose_reply", args: input },
      __copilotkit_messages__: [
        new AIMessage({
          content: "",
          tool_calls: [
            { id: crypto.randomUUID(), name: "compose_reply", args: input },
          ],
        }),
      ],
    });

    // On resume, `response` is the array of messages CopilotKit splices back in; the
    // human's decision is the content of the last one.
    const answer = Array.isArray(response)
      ? response[response.length - 1]?.content
      : response;

    return new ToolMessage({
      content:
        typeof answer === "string" ? answer : JSON.stringify(answer ?? {}),
      tool_call_id: runtime.toolCallId,
    });
  },
  {
    name: "compose_reply",
    description:
      "Draft a reply to an email by id. The email must already be classified — record a " +
      "classification with manage_emails first, or this will refuse. Pauses for human " +
      "approval before anything actually sends: call it as soon as the reply is ready, " +
      "don't ask the human separately first.",
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
      "Search school policy and course curriculum notes for context relevant to an email " +
      "(late-work and re-grade policy, absence/makeup rules, grade weighting, calculator " +
      "rules, and the common errors in each Grade 11/12 unit) before drafting a reply.",
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
