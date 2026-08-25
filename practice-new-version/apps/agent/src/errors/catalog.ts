import { ERROR_CODE, type ErrorCode } from "./codes";

export interface ErrorSpec {
  status: number; // HTTP status when this surfaces on a route
  expected: boolean; // false → the client/chat sees GENERIC_MESSAGE instead of userMessage
  retryable: boolean; // true → rethrow so LangGraph's retryPolicy still applies
  userMessage: string; // human-facing: HTTP body, chat notice, toast
  recovery?: string; // model-facing only — rides along in the tool-result envelope
}

// Shown whenever a spec is not `expected`, so an internal failure never describes itself.
export const GENERIC_MESSAGE = "Something went wrong on our end. Try again.";

// The one table every layer reads. User-facing wording lives here, never at the call site.
export const ERRORS: Record<ErrorCode, ErrorSpec> = {
  [ERROR_CODE.VALIDATION_FAILED]: {
    status: 400,
    expected: true,
    retryable: false,
    userMessage: "That request wasn't valid. Check the fields and try again.",
    recovery: "Fix the arguments to match the tool's schema, then retry.",
  },
  [ERROR_CODE.EMAIL_NOT_FOUND]: {
    status: 404,
    expected: true,
    retryable: false,
    userMessage: "That email is no longer in the inbox.",
    recovery: "Call get_emails for current ids, then retry.",
  },
  [ERROR_CODE.THREAD_NOT_FOUND]: {
    status: 404,
    expected: true,
    retryable: false,
    userMessage: "That conversation no longer exists.",
  },
  [ERROR_CODE.SENDER_NOT_FOUND]: {
    status: 404,
    expected: true,
    retryable: false,
    userMessage: "No sender in the inbox matches that name.",
    recovery: "Call get_emails to find the right name or address, then retry.",
  },
  [ERROR_CODE.SENDER_AMBIGUOUS]: {
    status: 409,
    expected: true,
    retryable: false,
    userMessage: "More than one sender matches that name.",
    recovery:
      "Retry with the exact name or address for the one the teacher means.",
  },
  [ERROR_CODE.STATUS_TRANSITION_INVALID]: {
    status: 409,
    expected: true,
    retryable: false,
    userMessage: "That status change isn't allowed for this email.",
    recovery:
      "A replied email cannot be marked unread — leave it as it is and say so.",
  },
  [ERROR_CODE.API_KEY_MISSING]: {
    status: 401,
    expected: true,
    retryable: false,
    userMessage:
      "I don't have an OpenAI API key to work with yet — enter yours in the chat panel, then try again.",
  },
  [ERROR_CODE.API_KEY_REJECTED]: {
    status: 401,
    expected: true,
    retryable: false,
    userMessage:
      "OpenAI rejected your API key — it looks wrong, revoked, or out of credit. Use the key button at the top of this panel to enter a different one.",
  },
  [ERROR_CODE.RATE_LIMITED]: {
    status: 429,
    expected: true,
    retryable: true,
    userMessage:
      "OpenAI is rate limiting this key right now. Try again shortly.",
    recovery: "Rate limited — retry the failed ids in a smaller batch.",
  },
  [ERROR_CODE.MODEL_TIMEOUT]: {
    status: 504,
    expected: true,
    retryable: true,
    userMessage: "That took too long to come back. Try again.",
    recovery: "The call timed out — retry once.",
  },
  [ERROR_CODE.MODEL_OUTPUT_INVALID]: {
    status: 502,
    expected: true,
    retryable: true,
    userMessage: "I couldn't make sense of that result. Try asking again.",
    recovery:
      "The model's output didn't match the expected shape — retry once.",
  },
  [ERROR_CODE.DB_UNAVAILABLE]: {
    status: 503,
    expected: false,
    retryable: true,
    userMessage: GENERIC_MESSAGE,
  },
  [ERROR_CODE.CONFIG_INVALID]: {
    status: 500,
    expected: false,
    retryable: false,
    userMessage: GENERIC_MESSAGE,
  },
  [ERROR_CODE.NOT_FOUND]: {
    status: 404,
    expected: true,
    retryable: false,
    userMessage: "Not found.",
  },
  [ERROR_CODE.INTERNAL]: {
    status: 500,
    expected: false,
    retryable: false,
    userMessage: GENERIC_MESSAGE,
  },
};
