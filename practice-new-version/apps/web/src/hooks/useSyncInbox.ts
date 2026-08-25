import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAgent } from "@copilotkit/react-core/v2";
import { inboxQueryKey } from "@/hooks/useSharedInbox";

// Invalidates the inbox query from the agent's run lifecycle (the first load comes from
// useSharedInbox itself). Needs useAgent(), which only resolves inside
// CopilotChatConfigurationProvider — call this once from a component in that subtree.
export const useSyncInbox = () => {
  // updates: [] — we only need the agent HANDLE to subscribe to run completion below.
  // Subscribing to all updates would re-render this component on every streamed token.
  const { agent } = useAgent({ updates: [] });
  const queryClient = useQueryClient();

  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onRunFinalized: () => {
        queryClient.invalidateQueries({ queryKey: inboxQueryKey });
      },
    });

    return unsubscribe;
  }, [agent, queryClient]);
};
