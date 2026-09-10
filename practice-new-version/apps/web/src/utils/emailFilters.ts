import type {
  Course,
  Email,
  EmailStatus,
  EmailTopic,
  Urgency,
  WorkType,
} from "@/types";
import {
  COURSE_LABEL,
  STATUS_LABEL,
  TOPIC_LABEL,
  URGENCY_LABEL,
  WORK_TYPE_LABEL,
} from "@/constants";

export interface EmailFilters {
  status?: EmailStatus;
  urgency?: Urgency;
  course?: Course;
  topic?: EmailTopic;
  workType?: WorkType;
  from?: string;
  subject?: string;
  hasWords?: string;
  receivedAfter?: string;
  receivedBefore?: string;
  // The toolbar's quick search — separate from the granular fields above, so it ORs across
  // sender, subject and body instead of pinning down just one of them.
  search?: string;
}

export const EMPTY_FILTERS: EmailFilters = {};

export const hasActiveFilters = (filters: EmailFilters): boolean => {
  return Object.values(filters).some((v) => v !== undefined && v !== "");
};

const includes = (haystack: string, needle: string): boolean => {
  return haystack.toLowerCase().includes(needle.toLowerCase());
};

type FilterCheck = (email: Email, filters: EmailFilters) => boolean;

const FILTER_CHECKS: FilterCheck[] = [
  (email, { status }) => !status || email.status === status,
  (email, { urgency }) => !urgency || email.classification?.urgency === urgency,
  (email, { course }) => !course || email.classification?.course === course,
  (email, { topic }) => !topic || email.classification?.topic === topic,
  (email, { workType }) =>
    !workType || email.classification?.workType === workType,
  (email, { from }) =>
    !from ||
    includes(email.from.name, from) ||
    includes(email.from.email, from),
  (email, { subject }) => !subject || includes(email.subject, subject),
  (email, { hasWords }) => !hasWords || includes(email.body, hasWords),
  (email, { receivedAfter }) =>
    !receivedAfter || email.receivedAt >= receivedAfter,
  // Exclusive-of-day-boundary would need end-of-day math; treating receivedBefore as an
  // ISO date and comparing lexicographically is fine since receivedAt is also ISO 8601.
  (email, { receivedBefore }) =>
    !receivedBefore || email.receivedAt.slice(0, 10) <= receivedBefore,
  (email, { search }) =>
    !search ||
    includes(email.from.name, search) ||
    includes(email.from.email, search) ||
    includes(email.subject, search) ||
    includes(email.body, search),
];

export const filterEmails = (
  emails: Email[],
  filters: EmailFilters,
): Email[] => {
  return emails.filter((email) =>
    FILTER_CHECKS.every((check) => check(email, filters)),
  );
};

export interface FilterPill {
  key: keyof EmailFilters;
  text: string;
}

// One entry per active *structured* field — `search` is left out, since that value already
// shows as plain typed text in the search bar rather than as a pill.
const PILL_FIELDS: {
  key: Exclude<keyof EmailFilters, "search">;
  label: string;
  format?: (filters: EmailFilters) => string;
}[] = [
  { key: "status", label: "Status", format: (f) => STATUS_LABEL[f.status!] },
  {
    key: "urgency",
    label: "Urgency",
    format: (f) => URGENCY_LABEL[f.urgency!],
  },
  { key: "course", label: "Grade", format: (f) => COURSE_LABEL[f.course!] },
  { key: "topic", label: "Type", format: (f) => TOPIC_LABEL[f.topic!] },
  {
    key: "workType",
    label: "Work type",
    format: (f) => WORK_TYPE_LABEL[f.workType!],
  },
  { key: "from", label: "From" },
  { key: "subject", label: "Subject" },
  { key: "hasWords", label: "Has words" },
  { key: "receivedAfter", label: "After" },
  { key: "receivedBefore", label: "Before" },
];

export const describeFilters = (filters: EmailFilters): FilterPill[] =>
  PILL_FIELDS.filter(({ key }) => filters[key]).map(
    ({ key, label, format }) => ({
      key,
      text: `${label}: ${format ? format(filters) : filters[key]}`,
    }),
  );
