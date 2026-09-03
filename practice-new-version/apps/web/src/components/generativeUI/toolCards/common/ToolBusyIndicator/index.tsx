import { PulsingDot, Spinner } from "@/components/common";
import { useComposeApproval } from "@/stores";

// Paused on the approval interrupt nothing is running — the dot reads as "waiting on you",
// the spinner as "working".
export const ToolBusyIndicator = () => {
  const awaitingApproval = useComposeApproval((s) => s.awaitingApproval);

  if (awaitingApproval) {
    return <PulsingDot />;
  }

  return <Spinner size="sm" className="h-3 w-3" />;
};
