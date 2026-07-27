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
