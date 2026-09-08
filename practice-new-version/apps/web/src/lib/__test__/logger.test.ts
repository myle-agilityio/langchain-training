import { beforeEach, describe, expect, it, vi } from "vitest";

import { logError, logInfo, logWarn } from "@/lib";

const lastLine = (spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> =>
  JSON.parse(String(spy.mock.lastCall?.[0]));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("logger", () => {
  it("writes one JSON line carrying level, message and a timestamp", () => {
    logError("apiFetch", { code: "NETWORK", status: 503 });

    const entry = lastLine(vi.mocked(console.error));

    expect(entry).toMatchObject({
      level: "error",
      message: "apiFetch",
      code: "NETWORK",
      status: 503,
    });
    expect(entry.timestamp).toEqual(expect.any(String));
  });

  it("drops context fields that were not set", () => {
    logError("apiFetch", { code: "NETWORK", status: undefined });

    expect(lastLine(vi.mocked(console.error))).not.toHaveProperty("status");
  });

  it("sends each level to its own console channel", () => {
    logInfo("ready");
    logWarn("slow");
    logError("failed");

    expect(lastLine(vi.mocked(console.info)).message).toBe("ready");
    expect(lastLine(vi.mocked(console.warn)).message).toBe("slow");
    expect(lastLine(vi.mocked(console.error)).message).toBe("failed");
  });
});
