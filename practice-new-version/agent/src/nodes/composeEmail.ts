import { AIMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { END, interrupt } from "@langchain/langgraph";

import { plainModel } from "../config/model.js";
import { COMPOSE_REPLY_ACTION } from "../constants/index.js";
import { getContactProfile, getEmail, updateEmail } from "../db/index.js";
import { draftPrompt, triagePrompt } from "../prompts/index.js";
import { searchKnowledge } from "../rag/index.js";
import { DraftSchema, TriageSchema, type Draft } from "../types/index.js";
import { findReplyCall } from "../utils/index.js";

type State = {
  messages: BaseMessage[];
  emailId: string;
  needsResearch: boolean;
  kbContext: string;
  senderContext: string;
  draft?: Draft;
};

// triage — resolve the email, classify it, persist the classification. A fixed node, not a
// tool, so the model can't skip classification on a bare "reply this".
export async function triage(state: State) {
  const call = findReplyCall(state.messages);
  const id = (call?.args as { id?: string } | undefined)?.id ?? "";
  const email = id ? await getEmail(id) : null;

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

  const { needsResearch, ...classification } = await plainModel
    .withStructuredOutput(TriageSchema)
    .invoke(triagePrompt(email));

  await updateEmail(email.id, { classification });
  return { emailId: email.id, needsResearch };
}

export function afterTriage(state: State) {
  if (!state.emailId) return END;
  return state.needsResearch ? "research" : "write_draft";
}

// research — pgvector search for the policy the draft must not invent, plus sender profile.
export async function research(state: State) {
  const email = await getEmail(state.emailId);
  if (!email) return { kbContext: "", senderContext: "" };

  const articles = await searchKnowledge(
    `${email.subject} ${email.body} ${Object.values(email.classification ?? {}).join(" ")}`,
  );
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

// request_approval — CopilotKit's interrupt payload shape, so useHumanInTheLoop renders the
// editable card. Resume starts a NEW run, so code after interrupt() never executes; the send
// is applied by the card via PATCH /api/emails.
export async function requestApproval(state: State) {
  const draft = state.draft!;
  const args = { id: state.emailId, subject: draft.subject, body: draft.body };
  interrupt({
    __copilotkit_interrupt_value__: { action: COMPOSE_REPLY_ACTION, args },
    __copilotkit_messages__: [
      new AIMessage({
        content: "",
        tool_calls: [{ id: crypto.randomUUID(), name: COMPOSE_REPLY_ACTION, args }],
      }),
    ],
  });
  return {};
}
