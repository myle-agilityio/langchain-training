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
