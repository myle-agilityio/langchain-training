import { ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { END, interrupt, type LangGraphRunnableConfig } from "@langchain/langgraph";

import { getPlainModelForConfig } from "@/config/model.js";
import { COMPOSE_REPLY_ACTION, CONTACT_PROFILE_NAMESPACE } from "@/constants/index.js";
import { getEmail } from "@/db/index.js";
import { checkCompliancePrompt, draftPrompt, needsResearchPrompt } from "@/prompts/index.js";
import { classify_emails, get_emails, search_knowledge_base } from "@/tools/index.js";
import {
  ComplianceCheckSchema,
  DraftSchema,
  NeedsResearchSchema,
  type ComplianceCheck,
  type ContactProfileValue,
  type Draft,
  type Email,
  type KBArticle,
  type RejectedDraft,
} from "@/types/index.js";
import { collectRevisionNotes, findReplyCall } from "@/utils/index.js";

type State = {
  messages: BaseMessage[];
  emailId: string;
  needsResearch: boolean;
  kbContext: string;
  senderContext: string;
  draft?: Draft;
  compliance?: ComplianceCheck;
  lastRejectedDraft: RejectedDraft | null;
};

// Reuses get_emails (rather than db/index.js's getEmail directly) so triage/research resolve an
// id through the same path the model itself uses — one lookup implementation, not two.
async function fetchEmailById(id: string): Promise<Email | null> {
  const { emails } = JSON.parse(await get_emails.invoke({ filter: { id } })) as { emails: Email[] };
  return emails[0] ?? null;
}

// triage — resolve the email, classify it (via classify_emails — skipped if already on file),
// decide whether drafting needs KB research. A fixed node, not a tool, so the model can't skip
// classification on a bare "reply this".
export async function triage(state: State, config: LangGraphRunnableConfig) {
  const call = findReplyCall(state.messages);
  const id = (call?.args as { id?: string } | undefined)?.id ?? "";
  const email = id ? await fetchEmailById(id) : null;

  if (!email) {
    // Answer the dangling tool call so the model can recover.
    return {
      emailId: "",
      messages: [
        new ToolMessage({
          tool_call_id: call?.id ?? "unknown",
          name: "reply_to_email",
          content: `No email with id "${id}". Call get_emails for current ids, then retry.`,
        }),
      ],
    };
  }

  if (!email.classification) {
    const { results } = JSON.parse(
      await classify_emails.invoke({ ids: [id] }, config),
    ) as {
      results: { id: string; ok: boolean; classification?: Email["classification"] }[];
    };
    email.classification = results[0]?.classification;
  }

  const { needsResearch } = await getPlainModelForConfig(config)
    .withStructuredOutput(NeedsResearchSchema)
    .invoke(needsResearchPrompt(email));

  return { emailId: email.id, needsResearch };
}

export function afterTriage(state: State) {
  if (!state.emailId) return END;
  return state.needsResearch ? "research" : "write_draft";
}

// research — search_knowledge_base for the policy the draft must not invent.
export async function research(state: State, config: LangGraphRunnableConfig) {
  const email = await fetchEmailById(state.emailId);
  if (!email) return { kbContext: "" };

  const query = `${email.subject} ${email.body} ${Object.values(email.classification ?? {}).join(" ")}`;
  const articles = JSON.parse(
    await search_knowledge_base.invoke({ query }, config),
  ) as KBArticle[];
  const kbContext = articles.length
    ? articles.map((a) => `## ${a.title}\n${a.content}`).join("\n\n")
    : "No relevant articles found. Do not state any policy you cannot ground here.";

  return { kbContext };
}

// write_draft — email + researched context in, subject/body out. The sender profile is read here,
// not in research: it's a cheap key lookup every draft should see, even when the KB isn't needed.
export async function writeDraft(state: State, config: LangGraphRunnableConfig) {
  const email = await getEmail(state.emailId);
  if (!email) return {};

  const profile = (await config.store?.get(CONTACT_PROFILE_NAMESPACE, email.from.email))?.value as
    | ContactProfileValue
    | undefined;
  const senderContext = profile
    ? [
        profile.name ? `Name: ${profile.name}` : "",
        profile.tone ? `Preferred tone: ${profile.tone}` : "",
        profile.facts?.length ? `Known facts: ${profile.facts.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  // Only revise the rejected draft when this compose is for the same email.
  const previousDraft =
    state.lastRejectedDraft?.emailId === state.emailId ? state.lastRejectedDraft : undefined;

  const draft = await getPlainModelForConfig(config)
    .withStructuredOutput(DraftSchema)
    .invoke(
      draftPrompt({
        email,
        kbContext: state.kbContext,
        senderContext,
        revisionNotes: collectRevisionNotes(state.messages, state.emailId),
        previousDraft,
      }),
    );
  return { draft, senderContext };
}

// Independent guardrail on every draft (tone, policy, PII) — advisory only, teacher decides.
export async function checkCompliance(state: State, config: LangGraphRunnableConfig) {
  const draft = state.draft!;
  const compliance = await getPlainModelForConfig(config)
    .withStructuredOutput(ComplianceCheckSchema)
    .invoke(checkCompliancePrompt(draft));
  return { compliance };
}

// Pauses for the teacher's approval card, then answers the dangling reply_to_email tool call with their decision.
export async function requestApproval(state: State) {
  const draft = state.draft!;
  const args = {
    id: state.emailId,
    subject: draft.subject,
    body: draft.body,
    compliance: state.compliance,
  };
  const resume = interrupt({ action: COMPOSE_REPLY_ACTION, args }) as {
    decision: "approve" | "reject";
    instruction: string;
    subject?: string;
    body?: string;
  };

  // On reject, keep the draft the teacher last saw (card edits included) as short-term memory
  // for a later "adjust it"; an approve clears it so it never bleeds into the next compose.
  const lastRejectedDraft: RejectedDraft | null =
    resume.decision === "reject"
      ? {
          emailId: state.emailId,
          subject: resume.subject ?? draft.subject,
          body: resume.body ?? draft.body,
        }
      : null;

  const call = findReplyCall(state.messages);
  return {
    lastRejectedDraft,
    messages: call
      ? [new ToolMessage({ tool_call_id: call.id ?? "unknown", content: resume.instruction })]
      : [],
  };
}
