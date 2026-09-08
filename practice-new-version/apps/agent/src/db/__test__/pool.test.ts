import { beforeEach, describe, expect, it, vi } from "vitest";

import { logError } from "@/logging";

const mocks = vi.hoisted(() => ({
  PoolCtor: vi.fn(),
  on: vi.fn(),
}));

vi.mock("pg", () => ({
  default: {
    Pool: class {
      constructor(options: unknown) {
        mocks.PoolCtor(options);
      }

      on(event: string, handler: (error: Error) => void) {
        mocks.on(event, handler);
      }
    },
  },
}));

vi.mock("@/config", () => ({
  getPgConnectionOptions: () => ({ connectionString: "postgres://x" }),
}));

vi.mock("@/logging", () => ({ logError: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  delete (globalThis as { agentPool?: unknown }).agentPool;
});

describe("getPool", () => {
  it("constructs the pool from the app's own connection options", async () => {
    const { getPool } = await import("../pool");

    getPool();

    expect(mocks.PoolCtor).toHaveBeenCalledWith({
      connectionString: "postgres://x",
    });
  });

  it("memoizes across calls, so a dev-server reload cannot leak a second pool", async () => {
    const { getPool } = await import("../pool");

    const first = getPool();
    const second = getPool();

    expect(second).toBe(first);
    expect(mocks.PoolCtor).toHaveBeenCalledTimes(1);
  });

  it("logs an idle client's error instead of letting node exit the process", async () => {
    const { getPool } = await import("../pool");

    getPool();

    const [, handler] = mocks.on.mock.calls[0] as [
      string,
      (error: Error) => void,
    ];
    const dropped = new Error("connection terminated");

    handler(dropped);

    expect(logError).toHaveBeenCalledWith(dropped, {
      detail: "idle pool client",
    });
  });
});
