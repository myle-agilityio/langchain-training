import type {
  Course,
  Email,
  EmailStatus,
  EmailTopic,
  Urgency,
  WorkType,
} from "@/types";

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
];

export const filterEmails = (
  emails: Email[],
  filters: EmailFilters,
): Email[] => {
  return emails.filter((email) =>
    FILTER_CHECKS.every((check) => check(email, filters)),
  );
};
