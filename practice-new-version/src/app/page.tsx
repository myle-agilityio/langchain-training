"use client";

import { ChatSidebar } from "@/components/chat-sidebar";
import { EmailInbox } from "@/components/email-inbox";
import { ThreadsMenu } from "@/components/threads-menu";
import {
  useGenerativeUIExamples,
  useExampleSuggestions,
  useEmailAgent,
  SharedInboxProvider,
  SelfManagedThreadsProvider,
} from "@/hooks";

import {
  CopilotChat,
  CopilotChatConfigurationProvider,
  CopilotThreadsDrawer,
} from "@copilotkit/react-core/v2";

export default function HomePage() {
  useGenerativeUIExamples();
  useExampleSuggestions();
  useEmailAgent();

  const body = (
    <div className="flex h-dvh w-full overflow-hidden">
      <div className="flex-1 min-w-0 h-full overflow-auto">
        <EmailInbox />
      </div>
      <ChatSidebar threadsMenu={<ThreadsMenu />}>
        <CopilotChat
          attachments={{ enabled: true }}
          input={{ disclaimer: () => null, className: "pb-6" }}
        />
      </ChatSidebar>
    </div>
  );

  return (
    /*
      One CopilotChatConfigurationProvider owns the active thread for the whole
      surface. It is UNCONTROLLED (no `threadId` prop): the threads menu (SDK
      drawer or the self-managed dropdown) drives it directly — picking a row sets
      the active thread, "+ New" resets to a fresh thread (clearing the chat), all
      with no host wiring. The chat and the canvas read the same active thread from
      the provider (the canvas's `useAgent()` falls back to it), so they stay on the
      same per-thread agent clone the chat's /connect replay populates.
    */
    <CopilotChatConfigurationProvider agentId="default">
      {/*
        SharedInboxProvider needs useAgent(), which only resolves inside this
        configuration provider — and it wraps BOTH the chat (EmailReplyCard renders
        inside CopilotChat) and the inbox panel, since they must read/write the
        same common inbox regardless of which one triggered the change.
      */}
      <SharedInboxProvider>
        <SelfManagedThreadsProvider>{body}</SelfManagedThreadsProvider>
      </SharedInboxProvider>
    </CopilotChatConfigurationProvider>
  );
}
