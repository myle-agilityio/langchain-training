import { beforeEach, describe, expect, it, vi } from "vitest";

import { STORAGE_KEY } from "@/constants";

// zustand's persist rehydrates when the store is created, so each case needs a fresh registry.
const loadStore = async (stored?: unknown) => {
  window.localStorage.clear();

  if (stored !== undefined) {
    window.localStorage.setItem(
      STORAGE_KEY.theme,
      JSON.stringify({ state: stored, version: 0 }),
    );
  }

  vi.resetModules();

  return (await import("../useTheme")).useTheme.getState().theme;
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("useTheme", () => {
  it("restores a stored theme", async () => {
    await expect(loadStore({ theme: "dark" })).resolves.toBe("dark");
  });

  it("ignores a hand-edited value that is not a theme", async () => {
    await expect(loadStore({ theme: "neon" })).resolves.toBe("system");
  });

  it("defaults to following the system when nothing is stored", async () => {
    await expect(loadStore()).resolves.toBe("system");
  });
});
