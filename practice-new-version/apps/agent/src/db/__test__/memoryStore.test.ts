import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setup: vi.fn(), ctor: vi.fn() }));

vi.mock("@langchain/langgraph-checkpoint-postgres/store", () => ({
  PostgresStore: class {
    constructor(options: unknown) {
      mocks.ctor(options);
    }

    setup() {
      return mocks.setup();
    }
  },
}));

vi.mock("@/config", () => ({
  getPgConnectionOptions: () => ({ connectionString: "postgres://x" }),
}));

beforeEach(() => {
  vi.resetModules();
  mocks.setup.mockReset().mockResolvedValue(undefined);
  mocks.ctor.mockReset();
});

describe("getMemoryStore", () => {
  it("builds the store from its own connection options and runs setup once", async () => {
    const { getMemoryStore } = await import("../memoryStore");

    await getMemoryStore();

    expect(mocks.ctor).toHaveBeenCalledWith({
      connectionOptions: { connectionString: "postgres://x" },
    });
    expect(mocks.setup).toHaveBeenCalledOnce();
  });

  it("memoizes across calls", async () => {
    const { getMemoryStore } = await import("../memoryStore");

    const first = await getMemoryStore();
    const second = await getMemoryStore();

    expect(second).toBe(first);
    expect(mocks.setup).toHaveBeenCalledOnce();
  });
});
