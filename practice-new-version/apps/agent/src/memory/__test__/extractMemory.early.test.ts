import { describe, expect, it, vi } from "vitest";

import { MEMORY_CHECKPOINT_NAMESPACE } from "@/constants";
import { extractMemoryForThread } from "../index";

const mocks = vi.hoisted(() => ({
  getPlainModelWithApiKey: vi.fn(),
  getThreadMessages: vi.fn(),
  getMemoryStore: vi.fn(),
}));

vi.mock("@/config", () => ({
  getPlainModelWithApiKey: mocks.getPlainModelWithApiKey,
}));

vi.mock("@/db", () => ({
  getThreadMessages: mocks.getThreadMessages,
  getMemoryStore: mocks.getMemoryStore,
}));

const store = () => ({ get: vi.fn(), put: vi.fn() });

describe("extractMemoryForThread — before any model call", () => {
  it("no-ops when no BYOK key is available, without touching the thread or the store", async () => {
    await extractMemoryForThread("t1", undefined);

    expect(mocks.getThreadMessages).not.toHaveBeenCalled();
    expect(mocks.getMemoryStore).not.toHaveBeenCalled();
  });

  it("no-ops when the thread has no saved transcript, without touching the store", async () => {
    mocks.getThreadMessages.mockResolvedValue(null);

    await extractMemoryForThread("t1", "sk-test");

    expect(mocks.getMemoryStore).not.toHaveBeenCalled();
  });

  it("no-ops when every saved message has already been checked", async () => {
    mocks.getThreadMessages.mockResolvedValue([
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ]);
    const memory = store();

    memory.get.mockResolvedValue({ value: { checkedCount: 2 } });
    mocks.getMemoryStore.mockResolvedValue(memory);

    await extractMemoryForThread("t1", "sk-test");

    expect(memory.put).not.toHaveBeenCalled();
    expect(mocks.getPlainModelWithApiKey).not.toHaveBeenCalled();
  });

  it("advances the checkpoint without calling the model when the new messages carry no text", async () => {
    mocks.getThreadMessages.mockResolvedValue([
      { role: "tool", content: "some tool result" },
    ]);
    const memory = store();

    memory.get.mockResolvedValue(undefined);
    mocks.getMemoryStore.mockResolvedValue(memory);

    await extractMemoryForThread("t1", "sk-test");

    expect(mocks.getPlainModelWithApiKey).not.toHaveBeenCalled();
    expect(memory.put).toHaveBeenCalledWith(
      MEMORY_CHECKPOINT_NAMESPACE,
      "t1",
      { checkedCount: 1 },
    );
  });
});
