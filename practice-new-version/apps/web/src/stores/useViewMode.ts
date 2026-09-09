import { create } from "zustand";

export type ViewMode = "chat" | "app";

interface ViewModeState {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
}

// Which tab the window is on: "chat" gives the chat the whole window, "app" splits it with the
// inbox. Client-only, deliberately not persisted — every session starts on chat.
export const useViewMode = create<ViewModeState>((set) => ({
  mode: "chat",
  setMode: (mode) => set({ mode }),
}));
