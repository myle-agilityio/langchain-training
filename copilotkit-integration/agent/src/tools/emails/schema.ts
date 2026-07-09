import { z } from "zod";

export const EmailClassificationSchema = z.object({
  intent: z.enum(["question", "bug", "billing", "feature", "complex"]),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  topic: z.string(),
  summary: z.string(),
});

export const EmailSchema = z.object({
  id: z.string(),
  fromName: z.string(),
  fromEmail: z.string(),
  subject: z.string(),
  body: z.string(),
  receivedAt: z.string(),
  status: z.enum(["unread", "read", "replied", "bug_filed"]),
  classification: EmailClassificationSchema.optional(),
  reply: z.string().optional(),
  bugTicketId: z.string().optional(),
});

export type Email = z.infer<typeof EmailSchema>;
export type EmailClassification = z.infer<typeof EmailClassificationSchema>;
