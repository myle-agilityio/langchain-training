// Mirrors agent/src/tools/emails/schema.ts's Email shape. Frontend and agent are
// separate TS projects (no shared import boundary), so this is kept minimal and
// duplicated deliberately rather than reached across the package boundary.
export interface Email {
  id: string;
  from: { name: string; email: string };
  subject: string;
  body: string;
  receivedAt: string;
  status: "unread" | "read" | "replied" | "bug_filed";
  classification?: {
    category: "question" | "bug" | "billing" | "feature" | "complex";
    urgency: "low" | "medium" | "high";
  };
  reply?: { subject: string; body: string; sentAt: string };
}
