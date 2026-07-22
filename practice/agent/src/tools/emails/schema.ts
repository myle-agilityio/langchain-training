import { z } from "zod";

export const EmailStatusSchema = z.enum([
  "unread",
  "read",
  "replied",
  "flagged_for_followup",
]);
export type EmailStatus = z.infer<typeof EmailStatusSchema>;

// Why the sender wrote. "complex" is deliberately kept as an escape hatch for
// emails that genuinely straddle several topics (an absence note that also
// disputes a grade and asks for a meeting) — without it classification is
// trivially easy and the triage step stops being interesting to watch.
export const EmailTopicSchema = z.enum([
  "question",
  "submission",
  "review_request",
  "grade_dispute",
  "absence",
  "scheduling",
  "admin",
  "complex",
]);
export type EmailTopic = z.infer<typeof EmailTopicSchema>;

// Which class it concerns. Closed enum rather than free text so the inbox can be
// filtered/grouped reliably; "none" covers school-admin mail tied to no class.
export const CourseSchema = z.enum(["math_11", "math_12", "none"]);
export type Course = z.infer<typeof CourseSchema>;

// Which artifact it's about. Frequently absent (an absence note references no
// work at all), hence the explicit "none" member instead of an optional field.
export const WorkTypeSchema = z.enum([
  "practice",
  "exercise",
  "homework",
  "quiz",
  "test",
  "project",
  "none",
]);
export type WorkType = z.infer<typeof WorkTypeSchema>;

export const UrgencySchema = z.enum(["low", "medium", "high"]);
export type Urgency = z.infer<typeof UrgencySchema>;

export const EmailClassificationSchema = z.object({
  topic: EmailTopicSchema,
  course: CourseSchema,
  workType: WorkTypeSchema,
  urgency: UrgencySchema,
});
export type EmailClassification = z.infer<typeof EmailClassificationSchema>;

export const EmailReplySchema = z.object({
  subject: z.string(),
  body: z.string(),
  sentAt: z.string(),
});
export type EmailReply = z.infer<typeof EmailReplySchema>;

export const EmailSchema = z.object({
  id: z.string(),
  from: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  subject: z.string(),
  body: z.string(),
  receivedAt: z.string(),
  status: EmailStatusSchema,
  // Left undefined until the agent classifies the email — seed data ships most
  // emails unclassified so classification is something that visibly happens
  // during the demo, not baked into the fixtures.
  classification: EmailClassificationSchema.optional(),
  // Only ever set by compose_reply, and compose_reply only ever runs after
  // humanInTheLoopMiddleware has approved (or edited) the send — see tools.ts.
  reply: EmailReplySchema.optional(),
});
export type Email = z.infer<typeof EmailSchema>;
