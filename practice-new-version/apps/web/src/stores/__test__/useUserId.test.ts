import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY } from "@/constants";

// The id is generated at module load, so each case needs a fresh registry.
const loadStore = async () => {
  vi.resetModules();

  return (await import("../useUserId")).useUserId.getState().userId;
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useUserId", () => {
  it("reuses the id already saved in this browser", async () => {
    window.localStorage.setItem(STORAGE_KEY.userId, "existing-id");

    await expect(loadStore()).resolves.toBe("existing-id");
  });

  it("generates one and saves it on a first visit", async () => {
    const userId = await loadStore();

    expect(userId).toEqual(expect.any(String));
    expect(window.localStorage.getItem(STORAGE_KEY.userId)).toBe(userId);
  });

  it("still produces an id when the browser refuses storage", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("access denied");
    });

    const userId = await loadStore();

    expect(userId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
