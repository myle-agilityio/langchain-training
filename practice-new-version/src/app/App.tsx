import { CopilotKit } from "@copilotkit/react-core/v2";
import {
  CopilotChat,
  CopilotChatConfigurationProvider,
} from "@copilotkit/react-core/v2";
import { ThemeProvider } from "@/hooks/use-theme";
import { OpenAiKeyProvider, readStoredOpenAiKey } from "@/hooks/use-openai-key";
import { OpenAiKeyGate } from "@/components/openai-key-gate";
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
// A2UI catalog: definitions + renderers in ./declarative-generative-ui/
import { demonstrationCatalog } from "./declarative-generative-ui/renderers";

function Inbox() {
  useGenerativeUIExamples();
  useExampleSuggestions();
  useEmailAgent();

  const body = (
    <div className="flex h-dvh w-full overflow-hidden gap-3 p-3 bg-[var(--background)]">
      <div className="flex-1 min-w-0 h-full overflow-hidden">
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

export default function App() {
  return (
    <ThemeProvider>
      <OpenAiKeyProvider>
        <CopilotKit
          runtimeUrl="/api/copilotkit"
          // Read fresh per request rather than from React state, so saving a key in
          // OpenAiKeyGate takes effect on the very next request with no remount — see
          // agent/src/config/model.ts's getApiKeyFromConfig for where this lands
          // server-side (config.configurable.copilotkit_forwarded_headers).
          headers={() => {
            const key = readStoredOpenAiKey();
            const headers: Record<string, string> = {};
            if (key) headers["x-openai-api-key"] = key;
            return headers;
          }}
          // Actual positioning is forced via the cpk-web-inspector CSS override in
          // globals.css — this prop is inert (see that comment for why) but left in place
          // to state the intent and in case CopilotKit fixes the underlying bug.
          inspectorDefaultAnchor={{ horizontal: "left", vertical: "bottom" }}
          a2ui={{ catalog: demonstrationCatalog }}
          openGenerativeUI={{}}
          useSingleEndpoint={false}
        >
          <OpenAiKeyGate>
            <Inbox />
          </OpenAiKeyGate>
        </CopilotKit>
      </OpenAiKeyProvider>
    </ThemeProvider>
  );
}
