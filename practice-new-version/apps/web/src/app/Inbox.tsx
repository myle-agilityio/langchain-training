import { CopilotChatConfigurationProvider } from "@copilotkit/react-core/v2";
import { ChatSidebar, EmailChat, EmailInbox, ThreadsMenu } from "@/components";
import {
  useEmailAgent,
  useExampleSuggestions,
  useGenerativeUIExamples,
} from "@/hooks";
import { AgentSync } from "./AgentSync";

export const Inbox = () => {
  useGenerativeUIExamples();
  useExampleSuggestions();
  useEmailAgent();

  const body = (
    <div className="flex h-dvh w-full overflow-hidden gap-3 p-3 bg-background">
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        <EmailInbox />
      </div>
      <ChatSidebar threadsMenu={<ThreadsMenu />}>
        <EmailChat />
      </ChatSidebar>
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
