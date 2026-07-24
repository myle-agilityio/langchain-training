/**
 * Suggestion pills shown in the chat UI. These mirror the flows in
 * docs/TEST-SCENARIOS.md, so clicking through them exercises the assistant's
 * main paths.
 *
 * Showcase mode (showcase.json) controls which pills are visually highlighted.
 * Highlight styling: globals.css (.a2ui-highlight, .opengenui-highlight)
 */
import { useConfigureSuggestions } from "@copilotkit/react-core/v2";
import showcaseConfig from "../../showcase.json";

const showcase = showcaseConfig.showcase;

export const useExampleSuggestions = () => {
  useConfigureSuggestions({
    suggestions: [
      {
        title: "Triage the inbox",
        message: "Classify all the unread emails.",
      },
      {
        title: "Count what's waiting",
        message:
          "How many unread emails do I have, and how many are about Grade 12?",
      },
      {
        title: "Draft a reply",
        message: "Draft a reply to Ezra about the missed test, for my approval.",
      },
      {
        title: "Inbox dashboard (A2UI)",
        message:
          "Show me a dashboard of my inbox — a breakdown by topic and by urgency.",
        className: showcase === "a2ui" ? "a2ui-highlight" : undefined,
      },
      {
        title: "Toggle Theme (Frontend Tools)",
        message: "Toggle the app theme using the toggleTheme tool.",
      },
    ],
    available: "always",
  });
};
