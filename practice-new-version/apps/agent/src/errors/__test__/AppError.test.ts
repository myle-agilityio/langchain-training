import { describe, expect, it } from "vitest";

import { AppError } from "../AppError";
import { ERRORS, GENERIC_MESSAGE } from "../catalog";
import { ERROR_CODE } from "../codes";

describe("AppError", () => {
  it("reads status, retryability and expectedness off the catalog", () => {
    const error = new AppError(ERROR_CODE.RATE_LIMITED);

    expect(error.status).toBe(ERRORS[ERROR_CODE.RATE_LIMITED].status);
    expect(error.retryable).toBe(ERRORS[ERROR_CODE.RATE_LIMITED].retryable);
    expect(error.expected).toBe(true);
    expect(error.name).toBe("AppError");
  });

  it("keeps the detail, context and cause for the log only", () => {
    const cause = new Error("underlying");
    const error = new AppError(ERROR_CODE.DB_UNAVAILABLE, {
      detail: "pool exhausted",
      context: { threadId: "t1" },
      cause,
    });

    expect(error.detail).toBe("pool exhausted");
    expect(error.message).toBe("pool exhausted");
    expect(error.context).toEqual({ threadId: "t1" });
    expect(error.cause).toBe(cause);
  });

  it("falls back to the code as its message when no detail is given", () => {
    expect(new AppError(ERROR_CODE.NOT_FOUND).message).toBe(
      ERROR_CODE.NOT_FOUND,
    );
  });

  it("hands an expected error its catalog wording and recovery", () => {
    const error = new AppError(ERROR_CODE.EMAIL_NOT_FOUND);

    expect(error.userMessage).toBe(
      ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].userMessage,
    );
    expect(error.recovery).toBe(ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].recovery);
  });

  it("never lets an unexpected error describe itself or offer recovery", () => {
    const error = new AppError(ERROR_CODE.INTERNAL, { detail: "stack trace" });

    expect(error.expected).toBe(false);
    expect(error.userMessage).toBe(GENERIC_MESSAGE);
    expect(error.recovery).toBeUndefined();
  });

  it("falls back to the internal spec for a code with no entry", () => {
    const error = new AppError("MADE_UP" as never);

    expect(error.spec).toBe(ERRORS[ERROR_CODE.INTERNAL]);
    expect(error.userMessage).toBe(GENERIC_MESSAGE);
  });
});
