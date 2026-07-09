export interface EmailClassification {
  intent: "question" | "bug" | "billing" | "feature" | "complex";
  urgency: "low" | "medium" | "high" | "critical";
  topic: string;
  summary: string;
}

export interface Email {
  id: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  status: "unread" | "read" | "replied" | "bug_filed";
  classification?: EmailClassification;
  reply?: string;
  bugTicketId?: string;
}
