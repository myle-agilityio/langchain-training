import { create } from "zustand";

type Theme = "dark" | "light" | "system";

const STORAGE_KEY = "theme";

// localStorage throws in some privacy modes; a missing/invalid value just means "system".
const readStored = (): Theme => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored;
    }

    return "system";
  } catch {
    return "system";
  }
};

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: readStored(),
  setTheme: (theme) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore write failures (e.g. private browsing)
    }

    set({ theme });
  },
}));
