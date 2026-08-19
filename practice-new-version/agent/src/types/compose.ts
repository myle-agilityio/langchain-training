import type { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";

// Triage's own structured output, decided separately from classification since classify_emails
// (reused as-is by triage) has no notion of "does drafting a reply need KB grounding".
export const NeedsResearchSchema = z.object({ needsResearch: z.boolean() });
export type NeedsResearchCheck = z.infer<typeof NeedsResearchSchema>;

export const DraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});
export type Draft = z.infer<typeof DraftSchema>;

// Thread-scoped short-term memory: the draft the teacher last rejected, kept in graph state so a
// later "adjust it" revises this draft instead of regenerating from scratch.
export const RejectedDraftSchema = DraftSchema.extend({ emailId: z.string() });
export type RejectedDraft = z.infer<typeof RejectedDraftSchema>;

// check_compliance's structured output — a guardrail flag shown on the approval card, not a
// hard block; the teacher still decides whether to send.
export const ComplianceCheckSchema = z.object({
  compliant: z.boolean(),
  violations: z.array(z.string()),
});
export type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>;

// Plain-object mirror of state/index.ts's ComposeEmailState StateSchema, for typing the
// compose subgraph's node functions (same relationship as AgentStateShape to AgentState).
export type ComposeEmailStateShape = {
  messages: BaseMessage[];
  emailId: string;
  needsResearch: boolean;
  kbContext: string;
  senderContext: string;
  draft?: Draft;
  compliance?: ComplianceCheck;
  lastRejectedDraft: RejectedDraft | null;
};
