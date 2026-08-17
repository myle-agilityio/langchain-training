import { ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { END, interrupt, type LangGraphRunnableConfig } from "@langchain/langgraph";

import { getPlainModelForConfig } from "@/config/model";
import { COMPOSE_REPLY_ACTION, CONTACT_PROFILE_NAMESPACE } from "@/constants/index";
import { getEmail } from "@/db/index";
import { checkCompliancePrompt, draftPrompt, needsResearchPrompt } from "@/prompts/index";
import { searchKnowledge } from "@/rag/index";
import { classifyEmail } from "@/tools/index";
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
} from "@/types/index";
import { collectRevisionNotes, findReplyCall } from "@/utils/index";

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

// Nodes call db/rag functions directly, never tool.invoke() — a tool invoked inside a node emits
// AG-UI TOOL_CALL events with no toolCallId, which kills the client's event stream mid-run.
async function fetchEmailById(id: string): Promise<Email | null> {
  return (await getEmail(id)) ?? null;
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
    const result = await classifyEmail(id, config);
    email.classification = result.ok ? result.classification : undefined;
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
  const articles = (await searchKnowledge(query, config)) as KBArticle[];
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
