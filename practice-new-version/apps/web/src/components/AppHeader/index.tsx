import { AppLogo } from "@/components/AppLogo";
import { ChangeKeyButton } from "@/components/openAIKey";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ViewTabs } from "@/components/ViewTabs";

// App-wide chrome: the logo, the tab switch, the theme and the key. Anything belonging to one
// conversation (model, history) sits in the chat pane's own toolbar instead.
export const AppHeader = () => (
  <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3">
    <AppLogo />
    <div className="flex items-center gap-2">
      <ChangeKeyButton />
      <ThemeToggle />
      <ViewTabs />
    </div>
  </header>
);
