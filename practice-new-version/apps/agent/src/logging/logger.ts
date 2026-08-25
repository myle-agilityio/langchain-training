import { AppError, toAppError } from "@/errors/index";
import { redactSecrets } from "@/utils/redaction";

export type LogLevel = "debug" | "info" | "warn" | "error";

// Every field a log line may carry. Anything not set is dropped from the JSON.
export interface LogContext {
  code?: string;
  category?: "expected" | "unexpected";
  userId?: string;
  requestId?: string;
  threadId?: string;
  runId?: string;
  node?: string;
  tool?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  detail?: string;
  stack?: string;
}

interface LogEntry extends LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
}

// Strips keys/PII from every string before it leaves the process for a log aggregator.
const scrub = (entry: LogEntry): LogEntry =>
  Object.fromEntries(
    Object.entries(entry)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        typeof value === "string" ? redactSecrets(value) : value,
      ]),
  ) as LogEntry;

const write = (level: LogLevel, message: string, context: LogContext = {}) => {
  const entry = scrub({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  });
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
};

export const logInfo = (message: string, context?: LogContext) =>
  write("info", message, context);

export const logWarn = (message: string, context?: LogContext) =>
  write("warn", message, context);

// One entry per failure — the only place a stack trace is ever written.
export const logError = (
  error: unknown,
  context: LogContext = {},
): AppError => {
  const appError = toAppError(error);

  write("error", appError.code, {
    ...context,
    ...appError.context,
    code: appError.code,
    category: appError.expected ? "expected" : "unexpected",
    detail: appError.detail,
    stack: appError.stack,
  });

  return appError;
};
