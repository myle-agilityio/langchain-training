import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AppError } from "../AppError";
import { ERROR_CODE } from "../codes";
import { toAppError } from "../normalize";

const zodErrorFrom = (schema: z.ZodTypeAny, value: unknown): z.ZodError => {
  const result = schema.safeParse(value);

  if (result.success) {
    throw new Error("fixture should not parse");
  }

  return result.error;
};

describe("toAppError", () => {
  it("hands back an AppError untouched, keeping its code and detail", () => {
    const original = new AppError(ERROR_CODE.EMAIL_NOT_FOUND, {
      detail: "id e1",
    });

    expect(toAppError(original)).toBe(original);
  });

  it("falls back to INTERNAL, or to the caller's code, for an unrecognised error", () => {
    expect(toAppError(new Error("boom")).code).toBe(ERROR_CODE.INTERNAL);
    expect(toAppError(new Error("boom"), ERROR_CODE.DB_UNAVAILABLE).code).toBe(
      ERROR_CODE.DB_UNAVAILABLE,
    );
  });

  it("keeps the thrown value as detail and cause", () => {
    const thrown = new Error("pool exhausted");
    const appError = toAppError(thrown);

    expect(appError.detail).toBe("pool exhausted");
    expect(appError.cause).toBe(thrown);
  });

  it("stringifies a non-object throw instead of sniffing it for fields", () => {
    expect(toAppError("just a string").detail).toBe("just a string");
    expect(toAppError(42).detail).toBe("42");
    expect(toAppError(null).detail).toBe("null");
    expect(toAppError(undefined).detail).toBe("undefined");
    expect(toAppError(null, ERROR_CODE.CONFIG_INVALID).code).toBe(
      ERROR_CODE.CONFIG_INVALID,
    );
  });
});

describe("toAppError — zod", () => {
  it("reports each failing field by path", () => {
    const error = zodErrorFrom(z.object({ subject: z.string() }), {});
    const appError = toAppError(error);

    expect(appError.code).toBe(ERROR_CODE.VALIDATION_FAILED);
    expect(appError.detail).toMatch(/^invalid fields: subject \(/);
    expect(appError.cause).toBe(error);
  });

  it("names a top-level failure (root) rather than an empty path", () => {
    const appError = toAppError(zodErrorFrom(z.string(), 123));

    expect(appError.detail).toContain("(root) (");
  });

  it("digs into a union's branches instead of reporting only (root)", () => {
    const schema = z.union([
      z.object({ course: z.string() }),
      z.object({ urgency: z.number() }),
    ]);
    const appError = toAppError(zodErrorFrom(schema, {}));

    expect(appError.detail).toContain("course (");
    expect(appError.detail).toContain("urgency (");
    expect(appError.detail).not.toContain("(root)");
  });

  it("ignores the caller's fallback — a zod failure is always VALIDATION_FAILED", () => {
    const error = zodErrorFrom(z.object({ id: z.string() }), {});

    expect(toAppError(error, ERROR_CODE.DB_UNAVAILABLE).code).toBe(
      ERROR_CODE.VALIDATION_FAILED,
    );
  });
});

describe("toAppError — foreign error shapes", () => {
  it("maps a rejected key from either status or code", () => {
    expect(toAppError({ status: 401 }).code).toBe(ERROR_CODE.API_KEY_REJECTED);
    expect(toAppError({ code: "invalid_api_key" }).code).toBe(
      ERROR_CODE.API_KEY_REJECTED,
    );
  });

  it("maps rate limiting, reading status off an axios-style response", () => {
    expect(toAppError({ status: 429 }).code).toBe(ERROR_CODE.RATE_LIMITED);
    expect(toAppError({ response: { status: 429 } }).code).toBe(
      ERROR_CODE.RATE_LIMITED,
    );
    expect(toAppError({ code: "rate_limit_exceeded" }).code).toBe(
      ERROR_CODE.RATE_LIMITED,
    );
  });

  it("maps every timeout spelling", () => {
    expect(toAppError({ name: "TimeoutError" }).code).toBe(
      ERROR_CODE.MODEL_TIMEOUT,
    );
    expect(toAppError({ name: "AbortError" }).code).toBe(
      ERROR_CODE.MODEL_TIMEOUT,
    );
    expect(toAppError({ code: "ETIMEDOUT" }).code).toBe(
      ERROR_CODE.MODEL_TIMEOUT,
    );
  });

  it("maps both spellings of a parser failure", () => {
    expect(toAppError({ name: "OutputParserException" }).code).toBe(
      ERROR_CODE.MODEL_OUTPUT_INVALID,
    );
    expect(toAppError({ name: "OutputParserError" }).code).toBe(
      ERROR_CODE.MODEL_OUTPUT_INVALID,
    );
  });

  it("maps postgres SQLSTATEs and driver codes to an unusable database", () => {
    for (const code of ["42P01", "28P01", "3D000", "08006", "53300", "57P03"]) {
      expect(toAppError({ code }).code).toBe(ERROR_CODE.DB_UNAVAILABLE);
    }

    expect(toAppError({ code: "ECONNREFUSED" }).code).toBe(
      ERROR_CODE.DB_UNAVAILABLE,
    );
    expect(toAppError({ code: "ENOTFOUND" }).code).toBe(
      ERROR_CODE.DB_UNAVAILABLE,
    );
  });

  it("leaves an unlisted postgres code on the fallback", () => {
    expect(toAppError({ code: "23505" }).code).toBe(ERROR_CODE.INTERNAL);
  });

  it("checks status before the db code table", () => {
    expect(toAppError({ status: 429, code: "ECONNREFUSED" }).code).toBe(
      ERROR_CODE.RATE_LIMITED,
    );
  });

  it("ignores code and status that are not a string and a number", () => {
    expect(toAppError({ code: 401 }).code).toBe(ERROR_CODE.INTERNAL);
    expect(toAppError({ status: "401" }).code).toBe(ERROR_CODE.INTERNAL);
  });
});
