import { z } from "zod";
import { tool } from "@langchain/core/tools";
import {
  AIMessage,
  HumanMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { interrupt } from "@langchain/langgraph";

import { plainModel } from "../model.js";
import { findEmail, patchEmail } from "../tools/emails/store.js";
import { searchKnowledgeBase } from "../tools/emails/knowledge-base.js";
import {
  CLASSIFICATION_GUIDE,
  EmailClassificationSchema,
  type Email,
} from "../tools/emails/schema.js";
import type { WorkingContext } from "../memory/index.js";
import { ComposeReplyDraftSchema, type ComposeReplyDraft } from "./state.js";

/**
 * The tool the main model calls to hand a reply off to this subgraph. It is NEVER executed by a
 * ToolNode — the parent graph's router sees the call and routes into the subgraph instead (see
 * agent.ts). It exists only so the model has a schema to call; the body is unreachable.
 *
 * Its description is deliberately the ONE place that tells the model "you don't classify or
 * search yourself" — because the subgraph now does both deterministically, which is the whole
 * point of the pipeline (the model kept skipping those steps).
 */
export const reply_to_email = tool(async () => "routed to compose-reply subgraph", {
  name: "reply_to_email",
  description:
    "Draft a reply to an email by id, for the teacher's approval. This runs the full reply " +
    "pipeline for you — it classifies the email if needed, looks up any relevant school " +
    "policy, writes the draft, and pauses for approval. Call it whenever the teacher wants to " +
    "reply to an email (or revise a draft); you do NOT need to classify or search the " +
    "knowledge base yourself first.",
  schema: z.object({
    id: z.string().describe("id of the email to reply to"),
  }),
});

interface ReplyTarget {
  id: string;
  callId: string;
}

/** The email id + tool-call id from the most recent reply_to_email call. */
function replyTarget(messages: BaseMessage[]): ReplyTarget | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (!AIMessage.isInstance(msg)) continue;
    const call = msg.tool_calls?.find((c) => c.name === "reply_to_email");
    if (call) return { id: String(call.args?.id ?? ""), callId: call.id ?? "" };
  }
  return undefined;
}

/** The latest thing the teacher actually typed — carries a revision like "make it shorter". */
function latestUserText(messages: BaseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (HumanMessage.isInstance(msg) && typeof msg.content === "string") {
      return msg.content;
    }
  }
  return "";
}

async function classify(email: Email) {
  const prompt =
    `Classify this email in a high school math teacher's inbox. Fill all four fields:\n` +
    `${CLASSIFICATION_GUIDE}\n\n` +
    `From: ${email.from.name} <${email.from.email}>\n` +
    `Subject: ${email.subject}\n` +
    `Body: ${email.body}`;
  return plainModel.withStructuredOutput(EmailClassificationSchema).invoke(prompt);
}

async function writeDraft(args: {
  email: Email;
  kbContext: string;
  prior?: ComposeReplyDraft;
  instruction: string;
}): Promise<ComposeReplyDraft> {
  // Drafting-content rules live here, not in the main system prompt: the subgraph is now the
  // only thing that writes reply text, so this is their single home (CLAUDE.md rule 9).
  const revision = args.prior
    ? `\n\nYou previously drafted this reply:\nSubject: ${args.prior.subject}\n` +
      `Body: ${args.prior.body}\n\nThe teacher now says: "${args.instruction}". Revise the ` +
      `draft accordingly and keep everything they didn't ask you to change — don't start over.`
    : "";

  const prompt =
    `Write a reply from the teacher (Ms. Lam) to the email below. It goes to a teenager or ` +
    `their parent, so keep it warm, plain, and specific about next steps and dates. Never ` +
    `promise a grade change, a waived penalty, or a re-grade outcome — offer the process ` +
    `instead. Ground any policy fact (a deadline, a penalty, a makeup rule) in the notes ` +
    `provided; do not invent one.\n\n` +
    `From ${args.email.from.name}:\nSubject: ${args.email.subject}\nBody: ${args.email.body}\n\n` +
    `Relevant school policy / curriculum notes:\n${args.kbContext || "(none found)"}` +
    revision;

  return plainModel.withStructuredOutput(ComposeReplyDraftSchema).invoke(prompt);
}

// --- Nodes -----------------------------------------------------------------

// All fields optional so this structural type is assignable to the graph's inferred state
// (LangGraph doesn't guarantee any channel is populated at a given node). Nodes guard reads.
type State = {
  messages?: BaseMessage[];
  workingContext?: WorkingContext;
  emailId?: string;
  kbContext?: string;
  draft?: ComposeReplyDraft;
};

/**
 * triage — load the target email and, if it isn't classified yet, classify it deterministically
 * and persist. This is the step the model used to skip; making it a fixed node is the point of
 * the subgraph. Sets `emailId` for the rest of the pipeline; leaves it "" (→ END) if the id is
 * unknown, answering the tool call with an error so the model can recover.
 */
export async function triage(state: State) {
  const target = replyTarget(state.messages ?? []);
  const email = target ? await findEmail(target.id) : undefined;

  if (!email) {
    return {
      emailId: "",
      messages: [
        new ToolMessage({
          content: `No email with id ${target?.id ?? "(none)"} — call get_emails for current ids.`,
          tool_call_id: target?.callId ?? "",
        }),
      ],
    };
  }

  if (!email.classification) {
    const classification = await classify(email);
    await patchEmail(email.id, { status: "read", classification });
  }
  return { emailId: email.id };
}

/** Route out of triage: skip the rest when the email wasn't found. */
export function afterTriage(state: State): "research" | "__end__" {
  return state.emailId ? "research" : "__end__";
}

/** research — always search the knowledge base for policy relevant to this email. */
export async function research(state: State) {
  const email = await findEmail(state.emailId!);
  if (!email) return {};
  const results = searchKnowledgeBase(`${email.subject} ${email.body}`);
  return { kbContext: JSON.stringify(results) };
}

/**
 * draft — write the reply (or revise the prior one), grounded in the classification + KB. Also
 * answers the reply_to_email tool call so the message history isn't left dangling before the
 * interrupt, and records the draft in workingContext so a later "make it shorter" has it.
 */
export async function draft(state: State) {
  const email = await findEmail(state.emailId!);
  if (!email) return {};

  const drafted = await writeDraft({
    email,
    kbContext: state.kbContext ?? "",
    prior: state.workingContext?.lastDraft,
    instruction: latestUserText(state.messages ?? []),
  });

  const target = replyTarget(state.messages ?? []);
  return {
    draft: drafted,
    messages: [
      new ToolMessage({
        content: `Drafted a reply to ${email.from.name} — review it below.`,
        tool_call_id: target?.callId ?? "",
      }),
    ],
    // Spread the existing context so recall's contact profile survives; overwrite focus + draft.
    workingContext: {
      ...state.workingContext,
      emailId: email.id,
      emailLabel: `"${email.subject}" from ${email.from.name}`,
      lastDraft: drafted,
    },
  };
}

/**
 * request_approval — raise the approval interrupt with CopilotKit's payload shape, so the
 * frontend's useHumanInTheLoop({ name: "compose_reply" }) renders the editable card. Same as the
 * old compose_reply tool did, just from a graph node. On CopilotKit's resume-by-new-run the code
 * after interrupt() never executes here; EmailReplyCard applies the send via PATCH /api/emails.
 */
export async function requestApproval(state: State) {
  const draft = state.draft!;
  const args = { id: state.emailId!, subject: draft.subject, body: draft.body };
  interrupt({
    __copilotkit_interrupt_value__: { action: "compose_reply", args },
    __copilotkit_messages__: [
      new AIMessage({
        content: "",
        tool_calls: [{ id: crypto.randomUUID(), name: "compose_reply", args }],
      }),
    ],
  });
  return {};
}
