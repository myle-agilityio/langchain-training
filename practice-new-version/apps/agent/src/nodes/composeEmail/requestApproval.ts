import { ToolMessage } from "@langchain/core/messages";
import { interrupt } from "@langchain/langgraph";

import { COMPOSE_REPLY_ACTION } from "@/constants/index";
import type { ComposeEmailStateShape, RejectedDraft } from "@/types/index";
import { findReplyCall } from "@/utils/index";

// Pauses for the teacher's approval card, then answers the dangling reply_to_email tool call with their decision.
export const requestApproval = async (state: ComposeEmailStateShape) => {
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
    // Cleared so the inbox stops showing this email as being drafted.
    emailId: "",
    messages: call
      ? [
          new ToolMessage({
            tool_call_id: call.id ?? "unknown",
            content: resume.instruction,
          }),
        ]
      : [],
  };
};
