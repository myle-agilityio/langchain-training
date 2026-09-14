// Discriminator in the interrupt() value the frontend's useInterrupt (useEmailAgent.tsx) matches on.
export const COMPOSE_REPLY_ACTION = "compose_reply";

// The word requestApproval.ts weaves into the model-facing instruction it answers
// reply_to_email's tool call with, and the one substring ReplyToEmailCard checks that text for —
// so a reworded instruction can't silently break what the card renders.
export const REPLY_DECISION = {
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;
