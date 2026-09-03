import { useState } from "react";
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

  // Lifted out of ChatSidebar so EmailInbox's corner toolbar can show its own "open chat"
  // button in the same cluster as ThemeToggle, instead of two independently-positioned buttons.
  const [chatCollapsed, setChatCollapsed] = useState(
    () => window.matchMedia("(max-width: 1023px)").matches,
  );

  const body = (
    <div className="flex h-dvh w-full overflow-hidden gap-3 p-3 bg-canvas">
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        <EmailInbox
          chatCollapsed={chatCollapsed}
          onOpenChat={() => setChatCollapsed(false)}
        />
      </div>
      <ChatSidebar
        threadsMenu={<ThreadsMenu />}
        collapsed={chatCollapsed}
        onCollapsedChange={setChatCollapsed}
      >
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
