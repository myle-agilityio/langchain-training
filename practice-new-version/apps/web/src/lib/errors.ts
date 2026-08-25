import { messageForCode } from "@/constants";
import { ERROR_CODE } from "@/types/errors";

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
