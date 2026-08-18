// Tool names, in one place so the router and the tool definitions can't drift.
export const TOOL = {
  GET_EMAILS: "get_emails",
  COUNT_EMAILS: "count_emails",
  CLASSIFY_EMAILS: "classify_emails",
  UPDATE_EMAIL_STATUS: "update_email_status",
  SEARCH_KNOWLEDGE_BASE: "search_knowledge_base",
  UPDATE_CONTACT_PROFILE: "update_contact_profile",
  REPLY_TO_EMAIL: "reply_to_email",
  GENERATE_A2UI: "generate_a2ui",
} as const;

// Shared description of the filter shape, so get_emails and count_emails don't drift.
export const FILTER_DESCRIPTION =
  "filter narrows by any combination of: id (exact match, for looking up one known email), " +
  "status, topic, course, workType, urgency (each an exact match on that classification field), " +
  "unclassified (true for emails never classified), sender (partial match on name or address), " +
  "search (partial match on subject or body), and receivedAfter/receivedBefore (ISO date or " +
  "datetime, inclusive — resolve relative dates like 'this week' or a weekday name against " +
  "today's date before calling). There is no field for the sender's role (parent/student/staff) " +
  "— infer that from sender/body instead. Omit filter for the whole inbox.";

// Caps concurrent classify_emails model calls to avoid rate-limiting the caller's BYOK key.
export const CLASSIFY_CONCURRENCY = 5;
