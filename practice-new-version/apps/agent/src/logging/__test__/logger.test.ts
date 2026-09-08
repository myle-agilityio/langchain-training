import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, ERROR_CODE, ERRORS } from "@/errors";
import { logError, logInfo, logWarn } from "../logger";

const lastLine = (spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> =>
  JSON.parse(String(spy.mock.lastCall?.[0]));

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("logger", () => {
  it("writes one JSON line with level, message and timestamp", () => {
    logInfo("node.ok", { node: "triage", durationMs: 12 });

    expect(lastLine(vi.mocked(console.log))).toMatchObject({
      level: "info",
      message: "node.ok",
      node: "triage",
      durationMs: 12,
    });
    expect(lastLine(vi.mocked(console.log)).timestamp).toEqual(
      expect.any(String),
    );
  });

  it("drops context fields that were never set", () => {
    logInfo("node.ok", { node: "triage", threadId: undefined });

    expect(lastLine(vi.mocked(console.log))).not.toHaveProperty("threadId");
  });

  it("sends each level to its own console channel", () => {
    logWarn("rag.seed_skipped");
    logError(new AppError(ERROR_CODE.DB_UNAVAILABLE));

    expect(lastLine(vi.mocked(console.warn)).level).toBe("warn");
    expect(lastLine(vi.mocked(console.error)).level).toBe("error");
  });

  it("scrubs credentials out of anything it writes", () => {
    logError(new Error("connect postgresql://user:pw@host/main failed"));

    expect(String(vi.mocked(console.error).mock.lastCall?.[0])).not.toContain(
      "user:pw",
    );
  });

  it("normalises whatever was thrown and returns it for the caller to reuse", () => {
    const returned = logError(new Error("boom"), { node: "triage" });

    expect(returned).toBeInstanceOf(AppError);
    expect(returned.code).toBe(ERROR_CODE.INTERNAL);
  });

  it("logs an expected failure under its own catalog code", () => {
    logError(new AppError(ERROR_CODE.EMAIL_NOT_FOUND));

    expect(lastLine(vi.mocked(console.error))).toMatchObject({
      message: ERROR_CODE.EMAIL_NOT_FOUND,
    });
    expect(ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].expected).toBe(true);
  });
});
