// Mirrors the agent's ERROR_CODE. Codes are the contract between the two packages; the wording
// for each one is per-package (see constants/errors.ts), so a server string never reaches the UI.
export const ERROR_CODE = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  EMAIL_NOT_FOUND: "EMAIL_NOT_FOUND",
  THREAD_NOT_FOUND: "THREAD_NOT_FOUND",
  SENDER_NOT_FOUND: "SENDER_NOT_FOUND",
  SENDER_AMBIGUOUS: "SENDER_AMBIGUOUS",
  STATUS_TRANSITION_INVALID: "STATUS_TRANSITION_INVALID",
  API_KEY_MISSING: "API_KEY_MISSING",
  API_KEY_REJECTED: "API_KEY_REJECTED",
  RATE_LIMITED: "RATE_LIMITED",
  MODEL_TIMEOUT: "MODEL_TIMEOUT",
  MODEL_OUTPUT_INVALID: "MODEL_OUTPUT_INVALID",
  DB_UNAVAILABLE: "DB_UNAVAILABLE",
  CONFIG_INVALID: "CONFIG_INVALID",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL: "INTERNAL",
  NETWORK: "NETWORK",
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

export interface ToolError {
  code: string;
  message: string;
  recovery?: string;
}

// What every agent tool now returns — cards branch on `ok` and nothing else.
export type ToolEnvelope<T> =
  { ok: true; data: T } | { ok: false; error: ToolError };
