import { CopilotKitCoreErrorCode } from "@copilotkit/react-core/v2";

import { messageForCode } from "@/constants";
import { logError } from "@/lib/logger";
import { toast } from "@/stores";
import { ERROR_CODE } from "@/types";

// What the rest of the app sees for any failed request: a code to branch on, wording that is
// safe to render, and the technical bits kept for the log only.
export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly requestId?: string;

  constructor(
    code: string,
    detail: string,
    status?: number,
    requestId?: string,
  ) {
    super(detail);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }

  // Never `message` — that's the developer-facing detail.
  get userMessage(): string {
    return messageForCode(this.code);
  }
}

export const toApiError = (error: unknown): ApiError =>
  error instanceof ApiError
    ? error
    : new ApiError(
        ERROR_CODE.INTERNAL,
        error instanceof Error ? error.message : String(error),
      );

// The chat codes that mean the runtime was never reached, whatever the browser thinks.
const CHAT_NETWORK_CODES: CopilotKitCoreErrorCode[] = [
  CopilotKitCoreErrorCode.RUNTIME_INFO_FETCH_FAILED,
  CopilotKitCoreErrorCode.AGENT_CONNECT_FAILED,
];

// A dropped chat stream has no response body to read a code off, so classify it here instead:
// a rejected fetch surfaces as TypeError, and an offline browser says so directly.
export const toChatError = (event: {
  error: Error;
  code: CopilotKitCoreErrorCode;
}): ApiError => {
  const unreachable =
    CHAT_NETWORK_CODES.includes(event.code) ||
    event.error instanceof TypeError ||
    (typeof navigator !== "undefined" && !navigator.onLine); // offline browser

  return new ApiError(
    unreachable ? ERROR_CODE.NETWORK : ERROR_CODE.INTERNAL,
    `chat stream failed (${event.code}): ${event.error.message}`,
  );
};

// The one place a failure becomes visible: a structured log for us, a toast for the teacher.
// Pass silent for a failure that happens in the background and shouldn't interrupt.
export const reportFailure = (
  error: unknown,
  source: string,
  silent = false,
) => {
  const apiError = toApiError(error);

  logError(source, {
    code: apiError.code,
    status: apiError.status,
    requestId: apiError.requestId,
    detail: apiError.message,
  });

  if (!silent) {
    toast.error(apiError.userMessage);
  }
};
