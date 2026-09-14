import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, ERROR_CODE } from "@/errors";
import { withNode } from "../withNode";

const config = { configurable: { thread_id: "t1" } };

const lastLog = (spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> =>
  JSON.parse(String(spy.mock.lastCall?.[0]));

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("withNode", () => {
  it("passes the node's own result straight through", async () => {
    const node = withNode("triage", async () => ({ emailId: "e1" }));

    await expect(node({}, config)).resolves.toEqual({ emailId: "e1" });
  });

  it("logs one timed line for a node that succeeded", async () => {
    await withNode("triage", async () => ({}))({}, config);

    expect(lastLog(vi.mocked(console.log))).toMatchObject({
      message: "node.ok",
      node: "triage",
      threadId: "t1",
    });
    expect(lastLog(vi.mocked(console.log)).durationMs).toEqual(
      expect.any(Number),
    );
  });

  it("rethrows any AppError so the graph's retry policy and nodeErrorHandler still apply", async () => {
    const node = withNode("triage", async () => {
      throw new AppError(ERROR_CODE.EMAIL_NOT_FOUND);
    });

    await expect(node({}, config)).rejects.toMatchObject({
      code: ERROR_CODE.EMAIL_NOT_FOUND,
    });
  });

  it("normalizes an unexpected failure before rethrowing it", async () => {
    const node = withNode("triage", async () => {
      throw new Error("pool exhausted at pg.js:41");
    });

    await expect(node({}, config)).rejects.toMatchObject({
      code: ERROR_CODE.INTERNAL,
    });
  });

  it("logs a failure once, with the node name and timing", async () => {
    const node = withNode("triage", async () => {
      throw new AppError(ERROR_CODE.EMAIL_NOT_FOUND);
    });

    await expect(node({}, config)).rejects.toThrow();

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(lastLog(vi.mocked(console.error))).toMatchObject({ node: "triage" });
  });
});
