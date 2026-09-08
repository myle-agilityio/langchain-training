import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { AppError, ERROR_CODE, ERRORS, GENERIC_MESSAGE } from "@/errors";
import { defineTool, toolError } from "../defineTool";

const invoke = (tool: ReturnType<typeof defineTool>, input: unknown) =>
  tool.invoke(input as never, { configurable: { thread_id: "t1" } });

const make = (run: () => unknown, passthrough = false) =>
  defineTool({
    name: "test_tool",
    description: "d",
    schema: z.object({ id: z.string() }),
    run: run as never,
    passthrough,
  });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("toolError", () => {
  it("carries the code, the safe wording and the recovery line", () => {
    expect(toolError(new AppError(ERROR_CODE.EMAIL_NOT_FOUND))).toEqual({
      code: ERROR_CODE.EMAIL_NOT_FOUND,
      message: ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].userMessage,
      recovery: ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].recovery,
    });
  });
});

describe("defineTool", () => {
  it("wraps plain data in the success envelope", async () => {
    const result = await invoke(
      make(() => ({ count: 3 })),
      { id: "e1" },
    );

    expect(JSON.parse(String(result))).toEqual({
      ok: true,
      data: { count: 3 },
    });
  });

  it("returns a passthrough payload unwrapped, for the client to parse", async () => {
    const result = await invoke(
      make(() => "raw-wire-payload", true),
      {
        id: "e1",
      },
    );

    expect(result).toBe("raw-wire-payload");
  });

  it("turns an expected failure into the error envelope, with recovery", async () => {
    const result = await invoke(
      make(() => {
        throw new AppError(ERROR_CODE.EMAIL_NOT_FOUND);
      }),
      { id: "e1" },
    );

    expect(JSON.parse(String(result))).toEqual({
      ok: false,
      error: {
        code: ERROR_CODE.EMAIL_NOT_FOUND,
        message: ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].userMessage,
        recovery: ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].recovery,
      },
    });
  });

  it("never hands the model an unexpected failure's detail", async () => {
    const result = await invoke(
      make(() => {
        throw new Error("pool exhausted at pg.js:41");
      }),
      { id: "e1" },
    );
    const envelope = JSON.parse(String(result));

    expect(envelope.ok).toBe(false);
    expect(envelope.error.message).toBe(GENERIC_MESSAGE);
    expect(envelope.error.recovery).toBeUndefined();
    expect(String(result)).not.toContain("pool exhausted");
  });

  it("answers a failed passthrough with the envelope too", async () => {
    const result = await invoke(
      make(() => {
        throw new AppError(ERROR_CODE.RATE_LIMITED);
      }, true),
      { id: "e1" },
    );

    expect(JSON.parse(String(result)).ok).toBe(false);
  });

  it("logs the failure once, naming the tool", async () => {
    await invoke(
      make(() => {
        throw new AppError(ERROR_CODE.DB_UNAVAILABLE);
      }),
      { id: "e1" },
    );

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(console.error).mock.lastCall?.[0])).toContain(
      "test_tool",
    );
  });
});
