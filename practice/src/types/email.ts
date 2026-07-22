// Mirrors agent/src/tools/emails/schema.ts's Email shape. Frontend and agent are
// separate TS projects (no shared import boundary), so this is kept minimal and
// duplicated deliberately rather than reached across the package boundary.
export type EmailStatus = "unread" | "read" | "replied" | "flagged_for_followup";
export type EmailTopic =
  | "question"
  | "submission"
  | "review_request"
  | "grade_dispute"
  | "absence"
  | "scheduling"
  | "admin"
  | "complex";
export type Course = "math_11" | "math_12" | "none";
export type WorkType =
  | "practice"
  | "exercise"
  | "homework"
  | "quiz"
  | "test"
  | "project"
  | "none";
export type Urgency = "low" | "medium" | "high";

export interface Email {
  id: string;
  from: { name: string; email: string };
  subject: string;
  body: string;
  receivedAt: string;
  status: EmailStatus;
  classification?: {
    topic: EmailTopic;
    course: Course;
    workType: WorkType;
    urgency: Urgency;
  };
  reply?: { subject: string; body: string; sentAt: string };
}
