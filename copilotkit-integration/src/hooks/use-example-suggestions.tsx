/**
 * Suggestion pills shown in the chat UI.
 */
import { useConfigureSuggestions } from "@copilotkit/react-core/v2";

export const useExampleSuggestions = () => {
  useConfigureSuggestions({
    suggestions: [
      {
        title: "Triage Inbox (Shared State + Human Review)",
        message:
          "Enable app mode, then read and classify the unread emails. Draft a reply for the login issue, and file a bug ticket for anything that looks like a bug -- I'll review both before anything is sent.",
      },
    ],
    available: "always",
  });
};
