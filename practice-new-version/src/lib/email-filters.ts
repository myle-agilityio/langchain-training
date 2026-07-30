import type { Course, Email, EmailStatus, EmailTopic, Urgency, WorkType } from "@/types/email";

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

export function hasActiveFilters(filters: EmailFilters): boolean {
  return Object.values(filters).some((v) => v !== undefined && v !== "");
}

function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function filterEmails(emails: Email[], filters: EmailFilters): Email[] {
  return emails.filter((email) => {
    if (filters.status && email.status !== filters.status) return false;
    if (filters.urgency && email.classification?.urgency !== filters.urgency) return false;
    if (filters.course && email.classification?.course !== filters.course) return false;
    if (filters.topic && email.classification?.topic !== filters.topic) return false;
    if (filters.workType && email.classification?.workType !== filters.workType) return false;
    if (
      filters.from &&
      !includes(email.from.name, filters.from) &&
      !includes(email.from.email, filters.from)
    ) {
      return false;
    }
    if (filters.subject && !includes(email.subject, filters.subject)) return false;
    if (filters.hasWords && !includes(email.body, filters.hasWords)) return false;
    if (filters.receivedAfter && email.receivedAt < filters.receivedAfter) return false;
    // Exclusive-of-day-boundary would need end-of-day math; treating receivedBefore as an
    // ISO date and comparing lexicographically is fine since receivedAt is also ISO 8601.
    if (filters.receivedBefore && email.receivedAt.slice(0, 10) > filters.receivedBefore) {
      return false;
    }
    return true;
  });
}
