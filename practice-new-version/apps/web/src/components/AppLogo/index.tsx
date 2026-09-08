import { cn } from "@/utils";

interface AppLogoProps {
  className?: string;
}

// The app's mark: a folded paper plane on the same amber→violet brand gradient the chat's
// welcome orb uses. Two wings, one shape each, so the fold still reads at 18px. The plane is
// `text-background` rather than white — that inverts with the theme, keeping it legible on the
// gradient in both.
export const AppLogo = ({ className }: AppLogoProps) => (
  <div className={cn("flex items-center gap-2.5 min-w-0", className)}>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-tone-amber to-tone-violet shadow-sm ring-1 ring-black/5">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[18px] w-[18px] -translate-x-px text-background"
      >
        <path d="M22 2 11 13l4 9 7-20Z" fill="currentColor" />
        <path d="M22 2 2 9l9 4 11-11Z" fill="currentColor" fillOpacity="0.7" />
      </svg>
    </span>
    <span className="hidden sm:block truncate text-[17px] font-extrabold leading-none tracking-tight">
      <span className="bg-linear-to-r from-tone-amber to-tone-violet bg-clip-text text-transparent">
        AI
      </span>{" "}
      <span className="text-foreground">Inbox Assistant</span>
    </span>
  </div>
);
