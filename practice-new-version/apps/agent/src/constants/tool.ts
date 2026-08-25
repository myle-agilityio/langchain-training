// Shared description of the filter shape, so get_emails and count_emails don't drift.
export const FILTER_DESCRIPTION =
  "Filter narrows by any combination of: id (exact match, for looking up one known email), " +
  "status, topic, course, workType, urgency (each an exact match on that classification field), " +
  "unclassified (true for emails never classified), sender (partial match on name or address), " +
  "search (partial match on subject or body), and receivedAfter/receivedBefore (ISO date or " +
  "datetime, inclusive — resolve relative dates like 'this week' or a weekday name against " +
  "today's date before calling). There is no field for the sender's role (parent/student/staff) " +
  "— infer that from sender/body instead. Omit filter for the whole inbox.";

// Caps concurrent classify_emails model calls to avoid rate-limiting the caller's BYOK key.
export const CLASSIFY_CONCURRENCY = 5;
