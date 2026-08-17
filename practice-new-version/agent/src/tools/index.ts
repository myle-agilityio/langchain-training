import { z } from "zod";
import { tool } from "@langchain/core/tools";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { copilotkitCustomizeConfig } from "@copilotkit/sdk-js/langgraph";

import { getPlainModelForConfig } from "@/config/model";
import { CONTACT_PROFILE_NAMESPACE, TOOL } from "@/constants/index";
import { aggregateEmails, getEmail, listEmails, updateEmail } from "@/db/index";
import { classifyPrompt } from "@/prompts/index";
import { searchKnowledge } from "@/rag/index";
import { ClassificationSchema, EmailFilterSchema, EmailGroupBySchema } from "@/types/index";
import type { ContactProfileValue } from "@/types/index";
import { redactEmailForModel } from "@/utils/index";
import { generate_a2ui } from "./a2ui";

// Shared description of the filter shape, so get_emails and count_emails don't drift.
const FILTER_DESCRIPTION =
  "filter narrows by any combination of: id (exact match, for looking up one known email), " +
  "status, topic, course, workType, urgency (each an exact match on that classification field), " +
  "unclassified (true for emails never classified), sender (partial match on name or address), " +
  "search (partial match on subject or body), and receivedAfter/receivedBefore (ISO date or " +
  "datetime, inclusive — resolve relative dates like 'this week' or a weekday name against " +
  "today's date before calling). There is no field for the sender's role (parent/student/staff) " +
  "— infer that from sender/body instead. Omit filter for the whole inbox.";

export const get_emails = tool(
  async (input: { filter?: z.infer<typeof EmailFilterSchema> }) => {
    const emails = await listEmails(input.filter);
    return JSON.stringify({ emails: emails.map(redactEmailForModel), count: emails.length });
  },
  {
    name: TOOL.GET_EMAILS,
    description:
      "List emails (id, sender, subject, body, status, classification), optionally filtered. " +
      `${FILTER_DESCRIPTION} For any 'how many' question use count_emails instead of counting ` +
      "this array yourself.",
    schema: z.object({ filter: EmailFilterSchema.optional() }),
  },
);

export const count_emails = tool(
  async (input: {
    filter?: z.infer<typeof EmailFilterSchema>;
    groupBy?: z.infer<typeof EmailGroupBySchema>;
  }) => JSON.stringify(await aggregateEmails(input.filter ?? {}, input.groupBy)),
  {
    name: TOOL.COUNT_EMAILS,
    description:
      "Count emails matching a filter, without fetching the emails themselves. Always use this " +
      `for 'how many' questions instead of counting get_emails' array. ${FILTER_DESCRIPTION} ` +
      "groupBy splits the count by that field (e.g. groupBy: \"status\" for a per-status " +
      "breakdown of the filtered set); omit it for a single total." +
      "When the teacher asks about unreplied emails, they mean anything that is not replied, not just unread ones.",
    schema: z.object({ filter: EmailFilterSchema.optional(), groupBy: EmailGroupBySchema.optional() }),
  },
);

// Exported so graph nodes classify by calling this directly — invoking the tool from inside a
// node emits AG-UI TOOL_CALL events with no toolCallId, which kills the client event stream.
export async function classifyEmail(id: string, config: LangGraphRunnableConfig) {
  const email = await getEmail(id);
  if (!email) return { id, ok: false as const, error: "no such email" };
  try {
    // Internal per-email classifier call — hide its forced tool call from the chat UI.
    const classification = await getPlainModelForConfig(config)
      .withStructuredOutput(ClassificationSchema)
      .invoke(
        classifyPrompt(email),
        copilotkitCustomizeConfig(config, { emitMessages: false, emitToolCalls: false }),
      );
    await updateEmail(id, { classification });
    return { id, ok: true as const, classification };
  } catch (error) {
    // Never throw — one bad email (rate limit, parse failure) shouldn't sink the whole batch.
    return { id, ok: false as const, error: error instanceof Error ? error.message : String(error) };
  }
}
}

// Classifies by reading each email's real content itself, so the caller only ever passes ids —
// never fields it might have guessed. One structured-output call per email, run in parallel.
export const classify_emails = tool(
  async (input: { ids: string[] }, config: LangGraphRunnableConfig) => {
    const results = await Promise.all(input.ids.map((id) => classifyEmail(id, config)));
    const failed = results.filter((r) => !r.ok);
    return JSON.stringify({
      results,
      ...(failed.length
        ? { recovery: "Call get_emails for current ids, then retry the failed ids." }
        : {}),
    });
  },
  {
    name: TOOL.CLASSIFY_EMAILS,
    description:
      "Classify one or more emails by id — it reads each email's actual current subject/body " +
      "itself and writes topic/course/workType/urgency to the inbox; you never compute or pass " +
      "the classification. Ids must be real: call get_emails first if the teacher described the " +
      "emails rather than naming exact ids. Batch every email you're classifying into one call. " +
      "Use this for any request to classify, triage, or tag email(s) — even 'classify this one' " +
      "on a single email.",
    schema: z.object({ ids: z.array(z.string()) }),
  },
);

// Omitting "replied" makes "mark it replied" unreachable — only a sent reply sets that.
const ManageableStatusSchema = z.enum(["unread", "read", "flagged_for_followup"]);

const StatusPatchSchema = z.object({
  id: z.string(),
  status: ManageableStatusSchema,
});

export const update_email_status = tool(
  async (input: { patches: z.infer<typeof StatusPatchSchema>[] }) => {
    const results = await Promise.all(
      input.patches.map(async (patch) => {
        const current = await getEmail(patch.id);
        if (!current) return { id: patch.id, ok: false as const, error: "no such email" };
        if (current.status === "replied" && patch.status === "unread") {
          return {
            id: patch.id,
            ok: false as const,
            error: "already replied — a replied email cannot be marked unread",
          };
        }
        const email = await updateEmail(patch.id, { status: patch.status });
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
    name: TOOL.UPDATE_EMAIL_STATUS,
    description:
      "Set status (unread/read/flagged_for_followup) on one or more emails. Batch every email " +
      "into a single call rather than one call each. Cannot mark an email replied: only sending " +
      "a reply does that. A replied email cannot be marked unread.",
    schema: z.object({ patches: z.array(StatusPatchSchema) }),
  },
);

export const search_knowledge_base = tool(
  async (input: { query: string }, config: LangGraphRunnableConfig) =>
    JSON.stringify(await searchKnowledge(input.query, config)),
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

// Resolves sender against real inbox data itself (like classify_emails resolves ids) instead of
// trusting a model-guessed address — "marcus.mohr@example.com" vs the real
// "marcus.mohr52@yahoo.com" would silently file the memory where it can never be found again.
export const update_contact_profile = tool(
  async (
    input: { sender: string; tone?: string; facts?: string[] },
    config: LangGraphRunnableConfig,
  ) => {
    const matches = await listEmails({ sender: input.sender });
    const addresses = [...new Set(matches.map((e) => e.from.email))];
    if (addresses.length === 0) {
      return JSON.stringify({
        ok: false,
        error: "no sender matches",
        recovery: "Call get_emails to find the right name or address, then retry.",
      });
    }
    if (addresses.length > 1) {
      return JSON.stringify({
        ok: false,
        error: "ambiguous sender — more than one address matches",
        matches: matches.map((e) => ({ name: e.from.name, email: e.from.email })),
        recovery: "Retry with the exact name or address for the one the teacher means.",
      });
    }
    const email = addresses[0];
    const name = matches.find((e) => e.from.email === email)!.from.name;

    const store = config.store;
    if (!store) throw new Error("BaseStore missing — graph must be compiled with a store.");
    // Store.put replaces the whole value, so merge facts read-modify-write style.
    const existing = (await store.get(CONTACT_PROFILE_NAMESPACE, email))?.value as
      | ContactProfileValue
      | undefined;
    const profile: ContactProfileValue = {
      name,
      tone: input.tone ?? existing?.tone ?? null,
      facts: [...new Set([...(existing?.facts ?? []), ...(input.facts ?? [])])],
    };
    await store.put(CONTACT_PROFILE_NAMESPACE, email, profile);
    return JSON.stringify({ ok: true, profile: { email, ...profile } });
  },
  {
    name: TOOL.UPDATE_CONTACT_PROFILE,
    description:
      "Save or update durable, cross-conversation memory about one email sender — their " +
      "preferred reply tone, or standing facts (accommodations, class/period, recurring context) " +
      "worth recalling in any future thread. Call this whenever the teacher asks you to remember " +
      "something about a person, even offhand ('remember that', 'keep in mind', 'note that'). " +
      "facts are merged into what's already on file, not replaced — pass only the new fact(s), " +
      "not the full list. sender is whatever the teacher called them (name or address) — this " +
      "tool resolves it against the real inbox itself, so never guess or construct an address. " +
      "Not for facts about a single email — that belongs in the reply itself, not the profile.",
    schema: z.object({
      sender: z.string(),
      tone: z.string().optional(),
      facts: z.array(z.string()).optional(),
    }),
  },
);

// Never executed as a tool — the router turns this call into a compose-email subgraph entry.
export const reply_to_email = tool(
  async () => "",
  {
    name: TOOL.REPLY_TO_EMAIL,
    description:
      "Draft a reply to one email and show it to the teacher for approval. Give the email's " +
      "id. Only for an explicit request to reply/draft/respond. When this tool is the " +
      "right call, it runs the whole pipeline itself — classify, look up policy, draft — so do " +
      "not call the classify or knowledge-base tools first. Nothing is sent without the teacher " +
      "approving the draft on screen.",
    schema: z.object({ id: z.string() }),
  },
);

export { generate_a2ui };

// Tools the model may call; reply_to_email is routing-only.
export const modelTools = [
  get_emails,
  count_emails,
  classify_emails,
  update_email_status,
  search_knowledge_base,
  update_contact_profile,
  generate_a2ui,
  reply_to_email,
];

// Tools the ToolNode actually runs.
export const executableTools = [
  get_emails,
  count_emails,
  classify_emails,
  update_email_status,
  search_knowledge_base,
  update_contact_profile,
  generate_a2ui,
];
