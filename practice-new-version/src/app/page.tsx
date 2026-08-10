"use client";

import { ExampleLayout } from "@/components/example-layout";
import { EmailInbox } from "@/components/email-inbox";
import { SelfManagedThreadsDrawer } from "@/components/self-managed-threads";
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

import styles from "./page.module.css";

// Mirrors next.config.ts: the SDK drawer needs Intelligence mode, which is currently broken
// in production (see the COPILOTKIT_LICENSE_TOKEN comment in .env) — fall back to a
// self-managed thread list backed by our own Postgres instead of the Intelligence platform.
const THREADS_LICENSED = process.env.NEXT_PUBLIC_COPILOTKIT_THREADS_ENABLED === "true";

export default function HomePage() {
  useGenerativeUIExamples();
  useExampleSuggestions();
  useEmailAgent();

  const body = (
    <div className={styles.layout}>
      {/*
        SDK threads drawer when Intelligence mode is licensed and working (SSR-safe,
        license-gated); otherwise our own drawer, reading/writing chat_threads via
        /api/threads. Either way it fills the same reserved grid column.
      */}
      {THREADS_LICENSED ? (
        <CopilotThreadsDrawer agentId="default" />
      ) : (
        <SelfManagedThreadsDrawer />
      )}
      <div className={styles.mainPanel}>
        <ExampleLayout
          chatContent={
            <CopilotChat
              attachments={{ enabled: true }}
              input={{ disclaimer: () => null, className: "pb-6" }}
            />
          }
          appContent={<EmailInbox />}
        />
      </div>
    </div>
  );

  return (
    /*
      One CopilotChatConfigurationProvider owns the active thread for the whole
      surface. It is UNCONTROLLED (no `threadId` prop): the threads drawer (SDK or
      self-managed) drives it directly — picking a row sets the active thread, "+ New"
      resets to a fresh thread (clearing the chat), all with no host wiring. The chat
      and the canvas read the same active thread from the provider (the canvas's
      `useAgent()` falls back to it), so they stay on the same per-thread agent
      clone the chat's /connect replay populates.

      The drawer is mounted INSIDE the provider so it registers with the chat
      configuration — that's what surfaces the header thread-list launcher on
      mobile, where the drawer is an off-canvas modal rather than a sidebar.
    */
    <CopilotChatConfigurationProvider agentId="default">
      {/*
        SharedInboxProvider needs useAgent(), which only resolves inside this
        configuration provider — and it wraps BOTH the chat (EmailReplyCard renders
        inside CopilotChat) and the inbox panel, since they must read/write the
        same common inbox regardless of which one triggered the change.
      */}
      <SharedInboxProvider>
        {THREADS_LICENSED ? (
          body
        ) : (
          <SelfManagedThreadsProvider>{body}</SelfManagedThreadsProvider>
        )}
      </SharedInboxProvider>
    </CopilotChatConfigurationProvider>
  );
}
