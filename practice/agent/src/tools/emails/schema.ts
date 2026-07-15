import { z } from "zod";

export const EmailStatusSchema = z.enum([
  "unread",
  "read",
  "replied",
  "bug_filed",
]);
export type EmailStatus = z.infer<typeof EmailStatusSchema>;

export const EmailCategorySchema = z.enum([
  "question",
  "bug",
  "billing",
  "feature",
  "complex",
]);
export type EmailCategory = z.infer<typeof EmailCategorySchema>;

export const UrgencySchema = z.enum(["low", "medium", "high"]);
export type Urgency = z.infer<typeof UrgencySchema>;

export const EmailClassificationSchema = z.object({
  category: EmailCategorySchema,
  urgency: UrgencySchema,
});
export type EmailClassification = z.infer<typeof EmailClassificationSchema>;

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
});
export type Email = z.infer<typeof EmailSchema>;
