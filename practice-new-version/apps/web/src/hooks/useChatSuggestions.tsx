import { useCallback, useEffect, useMemo, useState } from "react";
import { useAgent, useConfigureSuggestions } from "@copilotkit/react-core/v2";
import { generateSuggestions } from "@/api";
import { RECENT_MESSAGE_COUNT, SUGGESTION_COUNT } from "@/constants";
import { useOpenAIKey } from "@/stores";
import type { ChatSuggestion } from "@/types";
import { messageText, type AgentMessage } from "@/utils";

// isLoading renders the pill as a disabled spinner — shown while generating so the row never
// displays the previous turn's suggestions as if they were current.
type SuggestionPill = ChatSuggestion & { isLoading?: boolean };

const LOADING_SUGGESTIONS: SuggestionPill[] = [
  { title: "Thinking of suggestions…", message: "", isLoading: true },
];

// Curated pills for the empty welcome screen — there's no conversation to build on yet.
const WELCOME_SUGGESTIONS: ChatSuggestion[] = [
  {
    title: "Triage my inbox",
    message:
      "Classify the emails in my inbox and show me what needs attention.",
  },
  {
    title: "What's unread?",
    message: "Show me my unread emails, grouped by how urgent they are.",
  },
  {
    title: "Draft a reply",
    message:
      "Find the email that most needs a response and draft a reply for my approval.",
  },
];

// Roles included so the model can tell who said what — the thread-search snapshot in
// useSyncThreads deliberately drops them, so the two don't share a formatter.
const transcript = (messages: ReadonlyArray<AgentMessage>): string =>
  messages
    .map((m) => {
      const text = messageText(m)?.trim();

      return text ? `${m.role ?? "unknown"}: ${text}` : "";
    })
    .filter(Boolean)
    .slice(-RECENT_MESSAGE_COUNT)
    .join("\n\n");

// Self-managed suggestions: CopilotKit's dynamic mode forces a `copilotkitSuggest` tool call that
// this graph never answers, leaving the generation run open forever, so we generate them
// ourselves and hand CopilotKit a static list.
export const useChatSuggestions = () => {
  const { agent } = useAgent({ updates: [] });
  const apiKey = useOpenAIKey((s) => s.apiKey);
  const [suggestions, setSuggestions] =
    useState<ChatSuggestion[]>(WELCOME_SUGGESTIONS);
  const [isGenerating, setIsGenerating] = useState(false);

  const refresh = useCallback(async () => {
    const text = transcript(agent.messages as ReadonlyArray<AgentMessage>);

    if (!text || !apiKey) {
      return;
    }

    setIsGenerating(true);

    try {
      const next = await generateSuggestions(text, SUGGESTION_COUNT, apiKey);

      // An empty result would blank the row; keep the previous pills instead.
      if (next.length > 0) {
        setSuggestions(next);
      }
    } catch {
      // Nice-to-have: a failed refresh leaves the previous pills in place, no toast.
    } finally {
      setIsGenerating(false);
    }
  }, [agent, apiKey]);

  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onRunFinalized: () => void refresh(),
    });

    return unsubscribe;
  }, [agent, refresh]);

  // Memoized so the identity only changes on a real swap — useConfigureSuggestions reloads on
  // every dep change, and a fresh array each render would reload on every render.
  const shown = useMemo(
    () => (isGenerating ? LOADING_SUGGESTIONS : suggestions),
    [isGenerating, suggestions],
  );

  useConfigureSuggestions({ available: "always", suggestions: shown }, [shown]);
};
