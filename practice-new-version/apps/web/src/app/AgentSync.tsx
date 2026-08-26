import type { ReactNode } from "react";
import {
  useSyncComposeApproval,
  useSyncInbox,
  useSyncThreads,
} from "@/hooks";

// Needs useAgent()/useCopilotChatConfiguration(), which only resolve inside
// CopilotChatConfigurationProvider — wraps both chat and inbox since both use it.
export const AgentSync = ({ children }: { children: ReactNode }) => {
  useSyncInbox();
  useSyncThreads();
  useSyncComposeApproval();

  return <>{children}</>;
};
