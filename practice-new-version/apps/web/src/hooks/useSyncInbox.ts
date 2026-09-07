import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAgent } from "@copilotkit/react-core/v2";
import { TOOL } from "@repo/constants";
import { inboxQueryKey } from "@/hooks/useSharedInbox";

// The only tools that write to the emails table — a run that only read (get_emails,
// count_emails, search_knowledge_base...) or didn't touch email at all has nothing to refetch.
const EMAIL_MUTATING_TOOLS: readonly string[] = [
  TOOL.CLASSIFY_EMAILS,
  TOOL.UPDATE_EMAIL_STATUS,
  TOOL.REPLY_TO_EMAIL,
];

// Invalidates the inbox query from the agent's run lifecycle (the first load comes from
// useSharedInbox itself). Needs useAgent(), which only resolves inside
// CopilotChatConfigurationProvider — call this once from a component in that subtree.
export const useSyncInbox = () => {
  // updates: [] — we only need the agent HANDLE to subscribe to run completion below.
  // Subscribing to all updates would re-render this component on every streamed token.
  const { agent } = useAgent({ updates: [] });
  const queryClient = useQueryClient();
  // Set by onNewToolCall as the run streams in, read (and reset) once it finalizes — narrower
  // than scanning agent.messages, which holds the whole thread's history, not just this run's.
  const touchedEmailsRef = useRef(false);

  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onNewToolCall: ({ toolCall }) => {
        if (EMAIL_MUTATING_TOOLS.includes(toolCall.function.name)) {
          touchedEmailsRef.current = true;
        }
      },
      onRunFinalized: () => {
        if (touchedEmailsRef.current) {
          touchedEmailsRef.current = false;
          queryClient.invalidateQueries({ queryKey: inboxQueryKey });
        }
      },
    });

    return unsubscribe;
  }, [agent, queryClient]);
};
