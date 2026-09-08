import { AppLogo } from "@/components/AppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ViewTabs } from "@/components/ViewTabs";

// App-wide chrome only: the logo, the tab switch and the theme. Anything belonging to the
// conversation (model, key, history) sits in the chat pane's own toolbar instead.
export const AppHeader = () => (
  <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3">
    <AppLogo />
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <ViewTabs />
    </div>
  </header>
);
