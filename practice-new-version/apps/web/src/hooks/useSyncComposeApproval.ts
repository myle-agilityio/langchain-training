import { useEffect } from "react";
import {
  useAgent,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";
import { useComposeApproval } from "@/stores/useComposeApproval";

// Mirrors the graph's compose_reply pause into the store. agent.pendingInterrupts never
// populates — the LangGraph bridge signals via a CUSTOM "on_interrupt" event instead.
export const useSyncComposeApproval = () => {
  // updates: [] — only need the agent handle to subscribe to the interrupt events below.
  const { agent } = useAgent({ updates: [] });
  const threadId = useCopilotChatConfiguration()?.threadId;
  const openInterrupt = useComposeApproval((s) => s.openInterrupt);
  const clearInterrupt = useComposeApproval((s) => s.clearInterrupt);

  useEffect(() => {
    const subscription = agent.subscribe({
      onCustomEvent: ({ event }) => {
        if (event.name === "on_interrupt") {
          openInterrupt();
        }
      },
      onRunStartedEvent: () => clearInterrupt(),
      onRunFailed: () => clearInterrupt(),
    });

    return () => subscription.unsubscribe();
  }, [agent, openInterrupt, clearInterrupt]);

  // An unanswered card does not survive a thread switch, so neither should the flag it set —
  // otherwise the new thread inherits a disabled "Ask agent" with no card to explain it.
  useEffect(() => {
    clearInterrupt();
  }, [threadId, clearInterrupt]);
};
