import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setup: vi.fn(), ctor: vi.fn() }));

vi.mock("@langchain/langgraph-checkpoint-postgres", () => ({
  PostgresSaver: class {
    constructor(pool: unknown) {
      mocks.ctor(pool);
    }

    setup() {
      return mocks.setup();
    }
  },
}));

vi.mock("../pool", () => ({ getPool: () => "the-pool" }));

beforeEach(() => {
  vi.resetModules();
  mocks.setup.mockReset().mockResolvedValue(undefined);
  mocks.ctor.mockReset();
});

describe("getCheckpointer", () => {
  it("builds the saver from the shared pool and runs its setup once", async () => {
    const { getCheckpointer } = await import("../checkpointer");

    await getCheckpointer();

    expect(mocks.ctor).toHaveBeenCalledWith("the-pool");
    expect(mocks.setup).toHaveBeenCalledOnce();
  });

  it("memoizes, so a later call skips construction and setup entirely", async () => {
    const { getCheckpointer } = await import("../checkpointer");

    const first = await getCheckpointer();
    const second = await getCheckpointer();

    expect(second).toBe(first);
    expect(mocks.setup).toHaveBeenCalledOnce();
  });
});
