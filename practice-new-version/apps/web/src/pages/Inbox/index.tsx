import { CopilotChatConfigurationProvider } from "@copilotkit/react-core/v2";
import { AppHeader, ChatPanel, EmailInbox } from "@/components";
import {
  useEmailAgent,
  useChatSuggestions,
  useGenerativeUIExamples,
} from "@/hooks";
import { useViewMode } from "@/stores";
import { cn } from "@/utils";
import { AgentSync } from "./AgentSync";

export const Inbox = () => {
  useGenerativeUIExamples();
  useChatSuggestions();
  useEmailAgent();

  const mode = useViewMode((s) => s.mode);
  const isApp = mode === "app";

  // Both panes stay mounted whichever tab is open — EmailInbox registers filterInbox/showEmail
  // and publishes the open email as agent context, which the chat tab still needs.
  const body = (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-canvas">
      <AppHeader />
      <div className="flex flex-1 min-h-0 w-full gap-3 px-3 pb-3">
        <div
          className={cn(
            "h-full min-w-0 flex-col overflow-hidden rounded-xl bg-panel",
            isApp ? "hidden lg:flex lg:w-1/2" : "flex w-full",
          )}
        >
          <ChatPanel />
        </div>
        <div
          className={cn(
            "h-full min-w-0 overflow-hidden rounded-xl bg-panel",
            isApp ? "w-full lg:w-1/2" : "hidden",
          )}
        >
          <EmailInbox />
        </div>
      </div>
    </div>
  );

  return (
    /* Uncontrolled provider: the threads menu drives the active thread directly (row picks it,
       "+ New" resets it) — chat and canvas both read it via useAgent(), no host wiring needed. */
    <CopilotChatConfigurationProvider agentId="default">
      <AgentSync>{body}</AgentSync>
    </CopilotChatConfigurationProvider>
  );
};
