import { useEffect } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { useSharedInbox } from "@/stores/useSharedInbox";

// Keeps the inbox store fresh from the agent's run lifecycle. Needs useAgent(), which only resolves
// inside CopilotChatConfigurationProvider — call this once from a component in that subtree.
export const useSyncInbox = () => {
  // updates: [] — we only need the agent HANDLE to subscribe to run completion below.
  // Subscribing to all updates would re-render this component on every streamed token.
  const { agent } = useAgent({ updates: [] });
  const fetchEmails = useSharedInbox((state) => state.fetchEmails);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onRunFinalized: () => {
        fetchEmails();
      },
    });
    return unsubscribe;
  }, [agent, fetchEmails]);
};
