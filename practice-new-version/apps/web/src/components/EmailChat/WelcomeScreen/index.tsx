import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  input: ReactNode;
  suggestionView: ReactNode;
}

// Custom `welcomeScreen` slot for CopilotChat — `input` and `suggestionView` are the
// same bound elements the default layout uses, just handed to us to arrange ourselves.
export const WelcomeScreen = ({
  input,
  suggestionView,
}: WelcomeScreenProps) => (
  <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center">
    <div className="relative flex h-24 w-24 items-center justify-center">
      <div className="chat-orb-glow absolute -inset-4 rounded-full bg-linear-to-br from-tone-amber to-tone-violet blur-2xl" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-tone-amber to-tone-violet text-primary-foreground shadow-lg">
        <Sparkles className="h-6 w-6" />
      </div>
    </div>
    <div>
      <p className="text-lg font-semibold text-foreground">
        Hi, how can I help?
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Ask me to triage the inbox, draft a reply, or dig into an email.
      </p>
    </div>
    <div className="w-full max-w-sm">{suggestionView}</div>
    <div className="w-full">{input}</div>
  </div>
);
