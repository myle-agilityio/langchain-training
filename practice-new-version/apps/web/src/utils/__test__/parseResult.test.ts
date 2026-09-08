import { describe, expect, it } from "vitest";

import { parseToolResult } from "@/utils";

describe("parseToolResult", () => {
  it("returns null while the tool has produced nothing yet", () => {
    expect(parseToolResult(undefined)).toBeNull();
    expect(parseToolResult("")).toBeNull();
  });

  it("returns null for a payload cut short mid-stream", () => {
    expect(parseToolResult('{"ok":tr')).toBeNull();
  });

  it("returns null for valid JSON that is not an envelope", () => {
    expect(parseToolResult('{"emails":[]}')).toBeNull();
    expect(parseToolResult('{"ok":"true"}')).toBeNull();
    expect(parseToolResult("null")).toBeNull();
  });

  it("passes a success envelope through", () => {
    expect(
      parseToolResult<{ n: number }>('{"ok":true,"data":{"n":3}}'),
    ).toEqual({ ok: true, data: { n: 3 } });
  });

  it("passes a failure envelope through", () => {
    expect(
      parseToolResult(
        '{"ok":false,"error":{"code":"NOT_FOUND","message":"x"}}',
      ),
    ).toEqual({ ok: false, error: { code: "NOT_FOUND", message: "x" } });
  });
});
