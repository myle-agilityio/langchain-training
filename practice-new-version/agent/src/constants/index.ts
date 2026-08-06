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

// Discriminator in the interrupt() value the frontend's useInterrupt (use-email-agent.tsx) matches on.
export const COMPOSE_REPLY_ACTION = "compose_reply";

// pgvector table holding the embedded knowledge base.
export const KB_TABLE = "kb_documents";

// BaseStore namespace for sender profiles; the key within it is the sender's email address.
export const CONTACT_PROFILE_NAMESPACE = ["contact_profiles"];
