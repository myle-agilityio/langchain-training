import { AIMessage } from "@langchain/core/messages";

const notice = (content: string) => [
  new AIMessage({ id: crypto.randomUUID(), content }),
];

// No key reached the graph — the chat panel is showing the key form, so say where to type it.
export const missingApiKeyNotice = () =>
  notice(
    "I don't have an OpenAI API key to work with yet — enter yours in the chat panel, then " +
      "try again.",
  );

// OpenAI rejects a wrong, revoked, or unfunded key with 401; surfaced as chat text so the run
// ends with something the teacher can act on instead of a failed run.
export const rejectedApiKeyNotice = () =>
  notice(
    "OpenAI rejected your API key — it looks wrong, revoked, or out of credit. Use the key " +
      "button at the top of this panel to enter a different one.",
  );

export const isRejectedApiKeyError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  ((error as { status?: number }).status === 401 ||
    (error as { code?: string }).code === "invalid_api_key");
