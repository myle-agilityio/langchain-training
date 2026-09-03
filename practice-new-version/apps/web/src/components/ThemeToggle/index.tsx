import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/common";
import { useTheme } from "@/stores";
import { cn } from "@/utils";

interface ThemeToggleProps {
  className?: string;
}

// Reads the resolved class on <html> (kept in sync by useSyncTheme) rather than the store's
// theme value directly, so "system" still toggles off whatever it currently resolves to.
export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const setTheme = useTheme((s) => s.setTheme);

  const toggle = () => {
    const isDark = document.documentElement.classList.contains("dark");

    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className={cn(className)}
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="h-4 w-4 hidden dark:block" />
    </Button>
  );
};
