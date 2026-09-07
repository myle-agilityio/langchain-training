// Tool names, in one place so the agent's definitions and the frontend's renderers can't drift.
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
