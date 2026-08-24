import { ERRORS, GENERIC_MESSAGE, type ErrorSpec } from "./catalog";
import { ERROR_CODE, type ErrorCode } from "./codes";

interface AppErrorOptions {
  detail?: string; // technical context — logged, never returned
  context?: Record<string, unknown>;
  cause?: unknown;
}

// The only error type the app throws on purpose. Everything else goes through toAppError.
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly detail?: string;
  readonly context?: Record<string, unknown>;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    super(options.detail ?? code, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.detail = options.detail;
    this.context = options.context;
  }

  get spec(): ErrorSpec {
    return ERRORS[this.code] ?? ERRORS[ERROR_CODE.INTERNAL];
  }

  get expected(): boolean {
    return this.spec.expected;
  }

  get status(): number {
    return this.spec.status;
  }

  get retryable(): boolean {
    return this.spec.retryable;
  }

  // What a human may see. Unexpected errors never describe themselves.
  get userMessage(): string {
    return this.expected ? this.spec.userMessage : GENERIC_MESSAGE;
  }

  // What the model may see after a failed tool call.
  get recovery(): string | undefined {
    return this.expected ? this.spec.recovery : undefined;
  }
}
