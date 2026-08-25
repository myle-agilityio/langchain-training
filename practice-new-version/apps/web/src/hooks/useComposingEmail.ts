import { useAgent, UseAgentUpdate } from "@copilotkit/react-core/v2";
import { useComposeApproval } from "@/stores";

// The email the compose pipeline is drafting for, read off the graph's shared `emailId` state.
// It lands at the triage node's boundary, which is where the bridge snapshots state.
export const useComposingEmail = (): string | null => {
  const { agent } = useAgent({
    updates: [UseAgentUpdate.OnStateChanged, UseAgentUpdate.OnRunStatusChanged],
  });
  // isRunning goes false while the graph is paused on the approval interrupt, so this is the
  // other half of "the compose is still live".
  const awaitingApproval = useComposeApproval((s) => s.awaitingApproval);

  const state = agent.state as { emailId?: string } | undefined;

  // The field survives in the checkpoint after an aborted run — only trust it while one is live.
  if (!agent.isRunning && !awaitingApproval) {
    return null;
  }

  return state?.emailId || null;
};
