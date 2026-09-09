import { create } from "zustand";

const MIN_RATIO = 0.25;
const MAX_RATIO = 0.75;
const DEFAULT_RATIO = 0.5;

const clamp = (ratio: number) =>
  Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));

interface SplitRatioState {
  // Chat pane's share of the app-tab split, 0 to 1 — the inbox pane gets the rest.
  ratio: number;
  adjustRatio: (deltaRatio: number) => void;
  resetRatio: () => void;
}

// Client-only, deliberately not persisted — every session starts at an even split.
export const useSplitRatio = create<SplitRatioState>((set) => ({
  ratio: DEFAULT_RATIO,
  adjustRatio: (deltaRatio) =>
    set((state) => ({ ratio: clamp(state.ratio + deltaRatio) })),
  resetRatio: () => set({ ratio: DEFAULT_RATIO }),
}));
