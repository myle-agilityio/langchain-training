import type { EmailTopic } from "@/types/email";

import { TONE } from "./tone";

export const TOPIC_LABEL: Record<EmailTopic, string> = {
  question: "Question",
  submission: "Submission",
  review_request: "Review",
  grade_dispute: "Grade dispute",
  absence: "Absence",
  scheduling: "Scheduling",
  admin: "Admin",
  complex: "Complex",
};

// Six tones for eight topics: the two reused pairs never plausibly apply to the same email.
export const TOPIC_TONE: Record<EmailTopic, string> = {
  question: TONE.blue,
  submission: TONE.green,
  review_request: TONE.teal,
  grade_dispute: TONE.red,
  absence: TONE.amber,
  scheduling: TONE.violet,
  admin: TONE.blue,
  complex: TONE.violet,
};
