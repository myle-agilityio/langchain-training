import { ZodError } from "zod";

import { AppError } from "./AppError";
import { ERROR_CODE, type ErrorCode } from "./codes";

// Postgres SQLSTATEs / driver codes that mean "the database isn't usable", not "bad input".
const DB_CODES = new Set([
  "42P01", // undefined_table
  "28P01", // invalid_password
  "3D000", // invalid_catalog_name
  "08006", // connection_failure
  "53300", // too_many_connections
  "57P03", // cannot_connect_now
  "ECONNREFUSED",
  "ENOTFOUND",
]);

// A union's issues sit under unionErrors, so a flat map would only ever report "(root)".
const describeIssues = (error: ZodError): string[] =>
  error.issues.flatMap((issue) => {
    const unionErrors = (issue as { unionErrors?: ZodError[] }).unionErrors;

    if (unionErrors) {
      return unionErrors.flatMap(describeIssues);
    }

    return [`${issue.path.join(".") || "(root)"} (${issue.message})`];
  });

const codeOf = (error: object): string | undefined => {
  const value = (error as { code?: unknown }).code;

  return typeof value === "string" ? value : undefined;
};

const statusOf = (error: object): number | undefined => {
  const value =
    (error as { status?: unknown }).status ??
    (error as { response?: { status?: unknown } }).response?.status;

  return typeof value === "number" ? value : undefined;
};

const detailOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// The single place that inspects foreign error shapes — nothing else should sniff `.status`.
export const toAppError = (
  error: unknown,
  fallback: ErrorCode = ERROR_CODE.INTERNAL,
): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new AppError(ERROR_CODE.VALIDATION_FAILED, {
      detail: `invalid fields: ${describeIssues(error).join(", ")}`,
      cause: error,
    });
  }

  if (typeof error !== "object" || error === null) {
    return new AppError(fallback, { detail: detailOf(error) });
  }

  const code = codeOf(error);
  const status = statusOf(error);
  const name = (error as { name?: string }).name ?? "";
  const detail = detailOf(error);
  const options = { detail, cause: error };

  if (status === 401 || code === "invalid_api_key") {
    return new AppError(ERROR_CODE.API_KEY_REJECTED, options);
  }

  if (status === 429 || code === "rate_limit_exceeded") {
    return new AppError(ERROR_CODE.RATE_LIMITED, options);
  }

  if (
    name === "TimeoutError" ||
    name === "AbortError" ||
    code === "ETIMEDOUT"
  ) {
    return new AppError(ERROR_CODE.MODEL_TIMEOUT, options);
  }

  if (name === "OutputParserException" || name === "OutputParserError") {
    return new AppError(ERROR_CODE.MODEL_OUTPUT_INVALID, options);
  }

  if (code && DB_CODES.has(code)) {
    return new AppError(ERROR_CODE.DB_UNAVAILABLE, options);
  }

  return new AppError(fallback, options);
};
