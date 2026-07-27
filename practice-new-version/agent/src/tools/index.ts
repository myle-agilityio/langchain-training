import { z } from "zod";
import { tool } from "@langchain/core/tools";

import { TOOL } from "../constants/index.js";
import { countsByStatus, listEmails, updateEmail } from "../db/index.js";
import { searchKnowledge } from "../rag/index.js";
import { ClassificationSchema } from "../types/index.js";
import { generate_a2ui } from "./a2ui.js";

export const get_emails = tool(
  async () => {
    const [emails, counts] = await Promise.all([listEmails(), countsByStatus()]);
    return JSON.stringify({ emails, countsByStatus: counts });
  },
  {
    name: TOOL.GET_EMAILS,
    description:
      "Read the inbox. Returns every email with its id, sender, subject, body, status and " +
      "classification, plus countsByStatus — read counts from that field rather than tallying " +
      "the array, which is where counting goes wrong. The inbox is shared and changes between " +
      "turns independently of this chat, so call this again for any question about current " +
      "counts or status instead of reusing an earlier result.",
    schema: z.object({}),
  },
);

// Omitting "replied" makes "mark it replied" unreachable — only a sent reply sets that.
const ManageableStatusSchema = z.enum(["unread", "read", "flagged_for_followup"]);

const EmailPatchSchema = z.object({
  id: z.string(),
  status: ManageableStatusSchema.optional(),
  classification: ClassificationSchema.optional(),
});

export const manage_emails = tool(
  async (input: { patches: z.infer<typeof EmailPatchSchema>[] }) => {
    const results = await Promise.all(
      input.patches.map(async (patch) => {
        const email = await updateEmail(patch.id, patch);
        return email
          ? { id: patch.id, ok: true as const, status: email.status }
          : { id: patch.id, ok: false as const, error: "no such email" };
      }),
    );
    const failed = results.filter((r) => !r.ok);
    return JSON.stringify({
      results,
      ...(failed.length
        ? { recovery: "Call get_emails for current ids, then retry the failed patches." }
        : {}),
    });
  },
  {
    name: TOOL.MANAGE_EMAILS,
    description:
      "Record classification and/or status on one or more emails. Batch every email you are " +
      "triaging into a single call rather than one call each. When you classify, set all four " +
      "classification fields together — a partial classification renders as a half-filled " +
      "badge row in the inbox UI. Cannot mark an email replied: only sending a reply does that.",
    schema: z.object({ patches: z.array(EmailPatchSchema) }),
  },
);

export const search_knowledge_base = tool(
  async (input: { query: string }) => JSON.stringify(await searchKnowledge(input.query)),
  {
    name: TOOL.SEARCH_KNOWLEDGE_BASE,
    description:
      "Semantic search over school policy and course curriculum notes (late-work and re-grade " +
      "policy, absence/makeup rules, grade weighting, calculator rules, and the common errors " +
      "in each Grade 11/12 unit). Deadlines, penalties and makeup rules are never safe to " +
      "invent — ground them here before answering a policy question, standalone or not; a " +
      "general 'how do we handle X' question is answered by searching, not by asking which " +
      "email it's about.",
    schema: z.object({ query: z.string() }),
  },
);

// Never executed as a tool — the router turns this call into a compose-email subgraph entry.
export const reply_to_email = tool(
  async () => "",
  {
    name: TOOL.REPLY_TO_EMAIL,
    description:
      "Draft a reply to one email and show it to the teacher for approval. Give the email's " +
      "id. This runs the whole pipeline itself — classify, look up policy, draft — so do not " +
      "call the classify or knowledge-base tools first. Nothing is sent without the teacher " +
      "approving the draft on screen.",
    schema: z.object({ id: z.string() }),
  },
);

export { generate_a2ui };

// Tools the model may call; reply_to_email is routing-only.
export const modelTools = [
  get_emails,
  manage_emails,
  search_knowledge_base,
  generate_a2ui,
  reply_to_email,
];

// Tools the ToolNode actually runs.
export const executableTools = [
  get_emails,
  manage_emails,
  search_knowledge_base,
  generate_a2ui,
];
