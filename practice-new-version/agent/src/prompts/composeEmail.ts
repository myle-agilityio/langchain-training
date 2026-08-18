import type { Email } from "@/types/index";
import { renderEmail } from "@/utils/index";

// Used by the compose subgraph's triage node, after classification is already on file (fresh or
// pre-existing) — decides only the KB-research routing, not classification again.
export function needsResearchPrompt(email: Email): string {
  return (
    `Decide whether drafting a reply to this email needs to ground itself in school policy or ` +
    `curriculum. Set needsResearch: true when it does (late-work/re-grade policy, absence/makeup ` +
    `rules, grade weighting, calculator rules, deadlines or penalties, common unit errors). ` +
    `false for mail a reply can handle from the email alone, with no policy or curriculum claim ` +
    `to ground (e.g. a scheduling ack, a plain FYI, a yes/no with nothing at stake).\n\n` +
    `${renderEmail(email)}`
  );
}

// Used by checkCompliancePrompt — a guardrail check run on every draft before the approval card,
// independent of draftPrompt's own "never promise a grade change" instruction (defense in depth:
// this catches it even if the drafting call drifts).
const COMPLIANCE_GUIDE = `
  - Promises, guarantees, or states as already decided a grade change, exception, or reversal of
    a school decision — offer the review/appeal process instead, never the outcome.
  - Names or describes another student (grade, health, disciplinary, or accommodation details).
  - Dismissive, sarcastic, or unprofessional tone toward a parent, student, or staff member.
  - Legal, medical, or safety advice stated as fact.
  - A phone number, home address, or email address that doesn't belong in a reply.
`;

export function checkCompliancePrompt(draft: {
  subject: string;
  body: string;
}): string {
  return (
    `Check this drafted email reply for compliance issues before the teacher approves it.\n` +
    `Flag it (compliant: false) if it does any of the following:\n${COMPLIANCE_GUIDE}\n` +
    `List every violation found in \`violations\`, one short sentence each — empty array and ` +
    `compliant: true if none apply.\n\n` +
    `Subject: ${draft.subject}\n\nBody:\n${draft.body}`
  );
}

export function draftPrompt(args: {
  email: Email;
  kbContext: string;
  senderContext: string;
  revisionNotes: string;
  previousDraft?: { subject: string; body: string };
}): string {
  return `You are drafting a reply on behalf of a high school mathematics teacher. Write as the teacher, in first person.

    Rules:
    - Ground every policy claim in the reference material below. If it is not there, do not state it.
    - Never promise a grade will change. On a re-grade request, offer the process instead.
    - Warm and direct. No more than three short paragraphs. Sign off as "Ms. Lam".
    - The subject line replies to theirs (usually "Re: ...").
    ${
      args.revisionNotes
        ? `- The teacher said this about this reply — follow it, even where it adds something the email itself didn't ask for:\n${args.revisionNotes}`
        : ""
    }
    ${
      args.previousDraft
        ? `\nThe teacher rejected this earlier draft. Revise it according to their notes above — keep everything they didn't ask to change, rather than writing a new reply from scratch:\nSubject: ${args.previousDraft.subject}\nBody:\n${args.previousDraft.body}\n`
        : ""
    }

    Reference material (school policy and curriculum):
    ${args.kbContext}
    ${args.senderContext ? `\nWhat we know about the sender:\n${args.senderContext}\n` : ""}
    Email to reply to:
    ${renderEmail(args.email)}`;
}
