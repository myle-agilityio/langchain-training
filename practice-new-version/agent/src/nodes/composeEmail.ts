import { ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { END, interrupt } from "@langchain/langgraph";

import { plainModel } from "../config/model.js";
import { COMPOSE_REPLY_ACTION } from "../constants/index.js";
import { getContactProfile, getEmail } from "../db/index.js";
import { draftPrompt, needsResearchPrompt } from "../prompts/index.js";
import { classify_emails, get_emails, search_knowledge_base } from "../tools/index.js";
import { DraftSchema, NeedsResearchSchema, type Draft, type Email, type KBArticle } from "../types/index.js";
import { findReplyCall } from "../utils/index.js";

type State = {
  messages: BaseMessage[];
  emailId: string;
  needsResearch: boolean;
  kbContext: string;
  senderContext: string;
  draft?: Draft;
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
export async function triage(state: State) {
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
    const { results } = JSON.parse(await classify_emails.invoke({ ids: [id] })) as {
      results: { id: string; ok: boolean; classification?: Email["classification"] }[];
    };
    email.classification = results[0]?.classification;
  }

  const { needsResearch } = await plainModel
    .withStructuredOutput(NeedsResearchSchema)
    .invoke(needsResearchPrompt(email));

  return { emailId: email.id, needsResearch };
}

export function afterTriage(state: State) {
  if (!state.emailId) return END;
  return state.needsResearch ? "research" : "write_draft";
}

// research — search_knowledge_base for the policy the draft must not invent, plus sender profile.
export async function research(state: State) {
  const email = await fetchEmailById(state.emailId);
  if (!email) return { kbContext: "", senderContext: "" };

  const query = `${email.subject} ${email.body} ${Object.values(email.classification ?? {}).join(" ")}`;
  const articles = JSON.parse(await search_knowledge_base.invoke({ query })) as KBArticle[];
  const kbContext = articles.length
    ? articles.map((a) => `## ${a.title}\n${a.content}`).join("\n\n")
    : "No relevant articles found. Do not state any policy you cannot ground here.";

  const profile = await getContactProfile(email.from.email);
  const senderContext = profile
    ? [
        profile.name ? `Name: ${profile.name}` : "",
        profile.tone ? `Preferred tone: ${profile.tone}` : "",
        profile.facts?.length ? `Known facts: ${profile.facts.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return { kbContext, senderContext };
}

// write_draft — email + researched context in, subject/body out.
export async function writeDraft(state: State) {
  const email = await getEmail(state.emailId);
  if (!email) return {};
  const draft = await plainModel
    .withStructuredOutput(DraftSchema)
    .invoke(
      draftPrompt({
        email,
        kbContext: state.kbContext,
        senderContext: state.senderContext,
      }),
    );
  return { draft };
}

// request_approval — pauses the graph; the frontend's useInterrupt (use-email-agent.tsx) matches
// on `action` and renders the editable card. resolve() there sends `{decision, instruction}` as
// the resume value, which interrupt() returns here — the send itself already happened via the
// card's PATCH /api/emails, so this just answers the dangling reply_to_email tool call with the
// teacher's decision so the next call_model turn has valid history.
export async function requestApproval(state: State) {
  const draft = state.draft!;
  const args = { id: state.emailId, subject: draft.subject, body: draft.body };
  const resume = interrupt({ action: COMPOSE_REPLY_ACTION, args }) as {
    decision: "approve" | "reject";
    instruction: string;
  };

  const call = findReplyCall(state.messages);
  return {
    messages: call
      ? [new ToolMessage({ tool_call_id: call.id ?? "unknown", content: resume.instruction })]
      : [],
  };
}
