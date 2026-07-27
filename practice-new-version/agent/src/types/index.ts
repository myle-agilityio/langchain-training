import { z } from "zod";

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

// Triage's own structured output: classification plus the KB-research routing decision.
export const TriageSchema = ClassificationSchema.extend({ needsResearch: z.boolean() });
export type Triage = z.infer<typeof TriageSchema>;

export const DraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});
export type Draft = z.infer<typeof DraftSchema>;

// get_emails / count_emails share this filter shape.
export const EmailFilterSchema = z.object({
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

// validate_request's structured output: is the request something this assistant can do at all.
// declineMessage is nullable, not optional — OpenAI's strict structured output requires every
// field present, so "not applicable" has to be an explicit null rather than an omitted key.
export const ScopeCheckSchema = z.object({
  inScope: z.boolean(),
  // One short sentence shown to the teacher verbatim; null when inScope is true.
  declineMessage: z.string().nullable(),
});
export type ScopeCheck = z.infer<typeof ScopeCheckSchema>;

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

export interface ContactProfile {
  email: string;
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
