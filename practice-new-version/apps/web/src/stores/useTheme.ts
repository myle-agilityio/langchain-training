import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEY } from "@/constants";

type Theme = "dark" | "light" | "system";

const isTheme = (value: unknown): value is Theme =>
  value === "dark" || value === "light" || value === "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: STORAGE_KEY.theme,
      // A stale or hand-edited stored value shouldn't become the theme.
      merge: (persisted, current) => {
        const { theme } = (persisted ?? {}) as Partial<ThemeState>;

        return { ...current, theme: isTheme(theme) ? theme : current.theme };
      },
    },
  ),
);
