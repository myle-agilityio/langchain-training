import type {
  Course,
  EmailStatus,
  EmailTopic,
  Urgency,
  WorkType,
} from "@/types/email";

/*
 * One hue per meaning. Each entry is a Tailwind arbitrary-property utility that only sets
 * `--tone`; the treatment (tinted badge, solid badge, row rail, bar fill) is chosen separately
 * by whatever reads `--tone`, so a new hue is one line and a new treatment is zero.
 */
const TONE = {
  blue: "[--tone:var(--tone-blue)]",
  red: "[--tone:var(--tone-red)]",
  amber: "[--tone:var(--tone-amber)]",
  violet: "[--tone:var(--tone-violet)]",
  teal: "[--tone:var(--tone-teal)]",
  green: "[--tone:var(--tone-green)]",
} as const;

export const FALLBACK_TONE = TONE.violet;

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

// Six tones for eight topics, so two pairs share one — the reuses are paired so the two never
// plausibly apply to the same email, and the label disambiguates either way.
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

// Course and workType stay colourless (outline badges): they're filter facets, not triage
// signals, and hues would put four competing colours in one row and drown the urgency cue.
export const COURSE_LABEL: Record<Course, string> = {
  math_11: "Grade 11",
  math_12: "Grade 12",
  none: "",
};

export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  practice: "Practice",
  exercise: "Exercise",
  homework: "Homework",
  quiz: "Quiz",
  test: "Test",
  project: "Project",
  none: "",
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// Urgency shares hues with topics, so it's separated by treatment instead: only `high` gets
// the solid fill, keeping at most one loud badge per row.
export const URGENCY_TONE: Record<Urgency, string> = {
  high: TONE.red,
  medium: TONE.amber,
  low: TONE.teal,
};

export const URGENCY_VARIANT: Record<Urgency, "tone" | "toneSolid"> = {
  high: "toneSolid",
  medium: "tone",
  low: "tone",
};

export const STATUS_LABEL: Record<EmailStatus, string> = {
  unread: "Unread",
  read: "Read",
  replied: "Replied",
  flagged_for_followup: "Follow up",
};

export const STATUS_TONE: Record<EmailStatus, string> = {
  unread: TONE.violet,
  read: TONE.blue,
  replied: TONE.green,
  flagged_for_followup: TONE.amber,
};
