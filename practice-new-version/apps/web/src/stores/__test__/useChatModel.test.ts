import { beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY } from "@/constants";
import { CHAT_MODEL_OPTIONS, DEFAULT_CHAT_MODEL_ID } from "@repo/constants";

// zustand's persist rehydrates when the store is created, so each case needs a fresh registry.
const loadStore = async (stored?: unknown) => {
  window.localStorage.clear();

  if (stored !== undefined) {
    window.localStorage.setItem(
      STORAGE_KEY.chatModel,
      JSON.stringify({ state: stored, version: 0 }),
    );
  }

  vi.resetModules();

  return (await import("../useChatModel")).useChatModel.getState().modelId;
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("useChatModel", () => {
  it("restores a stored id that is still on offer", async () => {
    await expect(
      loadStore({ modelId: CHAT_MODEL_OPTIONS[1].id }),
    ).resolves.toBe(CHAT_MODEL_OPTIONS[1].id);
  });

  it("falls back when the stored id has outlived its option", async () => {
    await expect(loadStore({ modelId: "gpt-4-retired" })).resolves.toBe(
      DEFAULT_CHAT_MODEL_ID,
    );
  });

  it("falls back when nothing is stored at all", async () => {
    await expect(loadStore()).resolves.toBe(DEFAULT_CHAT_MODEL_ID);
  });
});
