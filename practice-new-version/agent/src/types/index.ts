import { z } from "zod";
import type { BaseMessage } from "@langchain/core/messages";

export const TopicSchema = z.enum([
  "question",
  "submission",
  "review_request",
  "grade_dispute",
  "absence",
  "scheduling",
  "admin",
  "complex",
]);
export const CourseSchema = z.enum(["math_11", "math_12", "none"]);
export const WorkTypeSchema = z.enum([
  "practice",
  "exercise",
  "homework",
  "quiz",
  "test",
  "project",
  "none",
]);
export const UrgencySchema = z.enum(["low", "medium", "high"]);
export const StatusSchema = z.enum([
  "unread",
  "read",
  "replied",
  "flagged_for_followup",
]);

export const ClassificationSchema = z.object({
  topic: TopicSchema,
  course: CourseSchema,
  workType: WorkTypeSchema,
  urgency: UrgencySchema,
});
export type Classification = z.infer<typeof ClassificationSchema>;

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

// get_emails / count_emails share this filter shape.
export const EmailFilterSchema = z.object({
  id: z.string().optional(),
  status: StatusSchema.optional(),
  topic: TopicSchema.optional(),
  course: CourseSchema.optional(),
  workType: WorkTypeSchema.optional(),
  urgency: UrgencySchema.optional(),
  unclassified: z.boolean().optional(),
  sender: z.string().optional(),
  search: z.string().optional(),
  receivedAfter: z.string().optional(),
  receivedBefore: z.string().optional(),
});
export type EmailFilter = z.infer<typeof EmailFilterSchema>;

export const EmailGroupBySchema = z.enum([
  "status",
  "topic",
  "course",
  "workType",
  "urgency",
]);
export type EmailGroupBy = z.infer<typeof EmailGroupBySchema>;

// moderator's structured output: is this chat message unsafe/abusive, distinct from
// SCOPE_GUIDE's capability check and ComplianceCheckSchema's outgoing-draft check.
export const ModerationCheckSchema = z.object({
  flagged: z.boolean(),
  // One short sentence shown to the teacher verbatim; null when flagged is false.
  declineMessage: z.string().nullable(),
});
export type ModerationCheck = z.infer<typeof ModerationCheckSchema>;

export interface Email {
  id: string;
  from: { name: string; email: string };
  subject: string;
  body: string;
  receivedAt: string;
  status: z.infer<typeof StatusSchema>;
  classification?: Classification;
  reply?: { subject: string; body: string; sentAt: string };
}

// Value stored in the BaseStore under CONTACT_PROFILE_NAMESPACE; the key is the sender's email.
export interface ContactProfileValue {
  name: string | null;
  tone: string | null;
  facts: string[];
}

export interface KBArticle {
  id: string;
  title: string;
  tags: string[];
  content: string;
}

export type CopilotKitEntry = { description?: string; value?: unknown };
export type CopilotKitAction = {
  name: string;
  description?: string;
  parameters?: unknown;
};
export type AgentStateShape = {
  messages: BaseMessage[];
  blocked?: boolean;
  copilotkit?: { context?: CopilotKitEntry[]; actions?: CopilotKitAction[] };
};
