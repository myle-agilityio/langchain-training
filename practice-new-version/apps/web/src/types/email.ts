export type EmailStatus =
  "unread" | "read" | "replied" | "flagged_for_followup";
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
  "practice" | "exercise" | "homework" | "quiz" | "test" | "project" | "none";
export type Urgency = "low" | "medium" | "high";

export interface Classification {
  topic: EmailTopic;
  course: Course;
  workType: WorkType;
  urgency: Urgency;
}

export interface Email {
  id: string;
  from: { name: string; email: string };
  subject: string;
  body: string;
  receivedAt: string;
  status: EmailStatus;
  classification?: Classification;
  reply?: { subject: string; body: string; sentAt: string };
}

export interface EmailFilterArgs {
  id?: string;
  status?: EmailStatus;
  topic?: EmailTopic;
  course?: Course;
  workType?: WorkType;
  urgency?: Urgency;
  unclassified?: boolean;
  sender?: string;
  search?: string;
  receivedAfter?: string;
  receivedBefore?: string;
}
