import { useEffect } from "react";
import { create } from "zustand";

type Theme = "dark" | "light" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useTheme = create<ThemeState>((set) => ({
  theme: "system",
  setTheme: (theme) => set({ theme }),
}));

// Applies the active theme to <html>; call once near the app root.
export function useSyncTheme() {
  const theme = useTheme((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => {
        root.classList.remove("light", "dark");
        root.classList.add(mq.matches ? "dark" : "light");
      };
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }

    root.classList.add(theme);
  }, [theme]);
}
