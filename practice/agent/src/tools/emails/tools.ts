import { z } from "zod";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";

import { EmailClassificationSchema } from "./schema.js";
import { searchKnowledgeBase } from "./knowledge-base.js";
import { countsByStatus, loadEmails, patchEmail } from "./store.js";
import { debug } from "../../debug.js";

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
    debug(`manage_emails: ${input.patches.length} patch(es)`, input.patches);
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

// The reply flow used to be a model-called `compose_reply` tool that classified, drafted, and
// raised the approval interrupt. It's now the compose-reply subgraph (see src/compose-reply/):
// the model calls `reply_to_email`, the graph routes into a deterministic triage → research →
// draft → approval pipeline. The interrupt payload + the "why raw interrupt(), not
// copilotKitInterrupt" reasoning moved to compose-reply/nodes.ts's request_approval node.

export const search_knowledge_base = tool(
  (input: { query: string }) => {
    return JSON.stringify(searchKnowledgeBase(input.query));
  },
  {
    name: "search_knowledge_base",
    description:
      "Search school policy and course curriculum notes for context relevant to an email " +
      "(late-work and re-grade policy, absence/makeup rules, grade weighting, calculator " +
      "rules, and the common errors in each Grade 11/12 unit). Call it before drafting a reply " +
      "or answering a policy/curriculum question — deadlines, penalties, and makeup rules are " +
      "never safe to invent, ground them here.",
    schema: z.object({ query: z.string() }),
  },
);

// Convenience grouping — don't spread this into createAgent's `tools` array.
// TTools' const-generic inference needs each tool passed as a literal array
// element; spreading a pre-typed array widens it and createAgent's overloads
// stop resolving (see agent.ts, which lists the three tools individually).
export const email_tools = [get_emails, manage_emails, search_knowledge_base];
