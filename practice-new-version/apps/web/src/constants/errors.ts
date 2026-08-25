import { ERROR_CODE, type ErrorCode } from "@/types";

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Try again.";

// The only wording the UI shows for a failure. Unknown codes fall back to the generic line, so
// a message from the server is never rendered verbatim.
export const ERROR_MESSAGE: Record<ErrorCode, string> = {
  [ERROR_CODE.VALIDATION_FAILED]: "That request wasn't valid.",
  [ERROR_CODE.EMAIL_NOT_FOUND]: "That email is no longer in the inbox.",
  [ERROR_CODE.THREAD_NOT_FOUND]: "That conversation no longer exists.",
  [ERROR_CODE.SENDER_NOT_FOUND]: "No sender in the inbox matches that name.",
  [ERROR_CODE.SENDER_AMBIGUOUS]: "More than one sender matches that name.",
  [ERROR_CODE.STATUS_TRANSITION_INVALID]:
    "That status change isn't allowed for this email.",
  [ERROR_CODE.API_KEY_MISSING]: "Enter your OpenAI API key to continue.",
  [ERROR_CODE.API_KEY_REJECTED]:
    "OpenAI rejected your API key. Enter a different one.",
  [ERROR_CODE.RATE_LIMITED]: "Rate limited by OpenAI. Try again shortly.",
  [ERROR_CODE.MODEL_TIMEOUT]: "That took too long to come back. Try again.",
  [ERROR_CODE.MODEL_OUTPUT_INVALID]: "That result came back unreadable.",
  [ERROR_CODE.DB_UNAVAILABLE]: GENERIC_ERROR_MESSAGE,
  [ERROR_CODE.CONFIG_INVALID]: GENERIC_ERROR_MESSAGE,
  [ERROR_CODE.NOT_FOUND]: "Not found.",
  [ERROR_CODE.INTERNAL]: GENERIC_ERROR_MESSAGE,
  [ERROR_CODE.NETWORK]: "Can't reach the server. Check your connection.",
};

export const messageForCode = (code: string): string =>
  ERROR_MESSAGE[code as ErrorCode] ?? GENERIC_ERROR_MESSAGE;
