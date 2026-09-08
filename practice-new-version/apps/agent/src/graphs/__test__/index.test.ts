import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildGraph } from "../index";

const mocks = vi.hoisted(() => ({
  ensureSchema: vi.fn(),
  getCheckpointer: vi.fn(),
  getMemoryStore: vi.fn(),
  ensureIndexed: vi.fn(),
}));

// Spread the real modules: the tools reached through @/nodes import from these barrels too.
vi.mock("@/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/db")>()),
  ensureSchema: mocks.ensureSchema,
  getCheckpointer: mocks.getCheckpointer,
  getMemoryStore: mocks.getMemoryStore,
}));

vi.mock("@/rag", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/rag")>()),
  ensureIndexed: mocks.ensureIndexed,
}));

const checkpointer = { name: "fake-checkpointer" };
const store = { name: "fake-store" };

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});

  mocks.ensureSchema.mockReset().mockResolvedValue(undefined);
  mocks.getCheckpointer.mockReset().mockResolvedValue(checkpointer);
  mocks.getMemoryStore.mockReset().mockResolvedValue(store);
  mocks.ensureIndexed.mockReset().mockResolvedValue(undefined);
});

describe("buildGraph", () => {
  it("creates the tables before opening the checkpointer and store", async () => {
    const graph = await buildGraph();

    expect(mocks.ensureSchema.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getCheckpointer.mock.invocationCallOrder[0],
    );
    expect(graph.checkpointer).toBe(checkpointer);
    expect(graph.store).toBe(store);
  });

  it("still returns a graph when seeding the knowledge base fails", async () => {
    mocks.ensureIndexed.mockRejectedValue(new Error("no embeddings key"));

    await expect(buildGraph()).resolves.toBeDefined();
    expect(console.error).toHaveBeenCalled();
  });
});
