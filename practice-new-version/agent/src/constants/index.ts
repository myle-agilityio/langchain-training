// Tool names, in one place so the router and the tool definitions can't drift.
export const TOOL = {
  GET_EMAILS: "get_emails",
  MANAGE_EMAILS: "manage_emails",
  SEARCH_KNOWLEDGE_BASE: "search_knowledge_base",
  REPLY_TO_EMAIL: "reply_to_email",
  GENERATE_A2UI: "generate_a2ui",
} as const;

// Interrupt action name the frontend's useHumanInTheLoop listens for.
export const COMPOSE_REPLY_ACTION = "compose_reply";

// pgvector table holding the embedded knowledge base.
export const KB_TABLE = "kb_documents";
