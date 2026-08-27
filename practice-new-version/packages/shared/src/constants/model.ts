// Chat model picker: options the frontend offers, the header carrying the pick (forwarded to the
// agent as copilotkit_forwarded_headers, same path as the BYOK key), and the id used when absent.
export const CHAT_MODEL_HEADER = "x-openai-model";

export const CHAT_MODEL_OPTIONS = [
  { id: "gpt-4o-mini", label: "GPT-4o mini" },
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { id: "gpt-4.1", label: "GPT-4.1" },
] as const;

export type ChatModelId = (typeof CHAT_MODEL_OPTIONS)[number]["id"];

export const DEFAULT_CHAT_MODEL_ID: ChatModelId = CHAT_MODEL_OPTIONS[0].id;
