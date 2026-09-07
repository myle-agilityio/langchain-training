import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTheme } from "@/stores";
import { useSyncTheme } from "../useSyncTheme";

let prefersDark: boolean;
let listeners: (() => void)[];

const stubMatchMedia = () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return prefersDark;
      },
      addEventListener: (_: string, fn: () => void) => listeners.push(fn),
      removeEventListener: (_: string, fn: () => void) => {
        listeners = listeners.filter((l) => l !== fn);
      },
    })),
  );
};

const root = () => document.documentElement;

beforeEach(() => {
  prefersDark = false;
  listeners = [];
  root().classList.remove("light", "dark");
  stubMatchMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useSyncTheme", () => {
  it("paints an explicit choice straight onto the document", () => {
    useTheme.setState({ theme: "dark" });
    renderHook(() => useSyncTheme());

    expect(root()).toHaveClass("dark");
    expect(root()).not.toHaveClass("light");
  });

  it("swaps cleanly when the choice changes", () => {
    useTheme.setState({ theme: "dark" });

    const { rerender } = renderHook(() => useSyncTheme());

    useTheme.setState({ theme: "light" });
    rerender();

    expect(root()).toHaveClass("light");
    expect(root()).not.toHaveClass("dark");
  });

  it("resolves system against what the OS currently prefers", () => {
    prefersDark = true;
    useTheme.setState({ theme: "system" });
    renderHook(() => useSyncTheme());

    expect(root()).toHaveClass("dark");
  });

  it("follows the OS changing its mind while on system", () => {
    useTheme.setState({ theme: "system" });
    renderHook(() => useSyncTheme());

    expect(root()).toHaveClass("light");

    prefersDark = true;
    listeners.forEach((fn) => fn());

    expect(root()).toHaveClass("dark");
  });

  it("stops following the OS once unmounted", () => {
    useTheme.setState({ theme: "system" });

    const { unmount } = renderHook(() => useSyncTheme());

    unmount();

    expect(listeners).toHaveLength(0);
  });
});
