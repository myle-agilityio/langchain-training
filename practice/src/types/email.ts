// Mirrors agent/src/tools/emails/schema.ts's Email shape. Frontend and agent are
// separate TS projects (no shared import boundary), so this is kept minimal and
// duplicated deliberately rather than reached across the package boundary.
export type EmailStatus = "unread" | "read" | "replied" | "bug_filed";
export type EmailCategory = "question" | "bug" | "billing" | "feature" | "complex";
export type Urgency = "low" | "medium" | "high";

export interface Email {
  id: string;
  from: { name: string; email: string };
  subject: string;
  body: string;
  receivedAt: string;
  status: EmailStatus;
  classification?: {
    category: EmailCategory;
    urgency: Urgency;
  };
  reply?: { subject: string; body: string; sentAt: string };
}
