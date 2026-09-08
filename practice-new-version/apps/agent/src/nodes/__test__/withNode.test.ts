import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, ERROR_CODE, ERRORS, GENERIC_MESSAGE } from "@/errors";
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

  it("rethrows a retryable failure so the graph's retry policy still applies", async () => {
    const node = withNode("triage", async () => {
      throw new AppError(ERROR_CODE.RATE_LIMITED);
    });

    await expect(node({}, config)).rejects.toMatchObject({
      code: ERROR_CODE.RATE_LIMITED,
    });
  });

  it("ends the turn with chat text on a terminal failure", async () => {
    const node = withNode("triage", async () => {
      throw new AppError(ERROR_CODE.EMAIL_NOT_FOUND);
    });
    const result = (await node({}, config)) as {
      messages: { content: string }[];
    };

    expect(result.messages[0].content).toBe(
      ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].userMessage,
    );
  });

  it("writes the extra state a node asked for alongside the notice", async () => {
    const node = withNode(
      "moderator",
      async () => {
        throw new AppError(ERROR_CODE.EMAIL_NOT_FOUND);
      },
      { blocked: true },
    );

    await expect(node({}, config)).resolves.toMatchObject({ blocked: true });
  });

  it("never lets an unexpected failure describe itself in chat", async () => {
    const node = withNode("triage", async () => {
      throw new Error("pool exhausted at pg.js:41");
    });
    const result = (await node({}, config)) as {
      messages: { content: string }[];
    };

    expect(result.messages[0].content).toBe(GENERIC_MESSAGE);
  });

  it("logs a failure once, with the node name and timing", async () => {
    const node = withNode("triage", async () => {
      throw new AppError(ERROR_CODE.EMAIL_NOT_FOUND);
    });

    await node({}, config);

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(lastLog(vi.mocked(console.error))).toMatchObject({ node: "triage" });
  });
});
