import type { ReactNode } from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";
import {
  CopilotChat,
  CopilotChatConfigurationProvider,
} from "@copilotkit/react-core/v2";
import { useSyncTheme } from "@/stores/use-theme";
import { readStoredOpenAiKey } from "@/stores/use-openai-key";
import { useSyncSharedInboxWithAgent } from "@/stores/use-shared-inbox";
import { useSyncSelfManagedThreadsWithAgent } from "@/stores/use-self-managed-threads";
import { OpenAiKeyGate } from "@/components/openai-key-gate";
import { ChatSidebar } from "@/components/chat-sidebar";
import { EmailInbox } from "@/components/email-inbox";
import { ThreadsMenu } from "@/components/threads-menu";
import {
  useGenerativeUIExamples,
  useExampleSuggestions,
  useEmailAgent,
} from "@/hooks";
// A2UI catalog: definitions + renderers in ./declarative-generative-ui/
import { demonstrationCatalog } from "./declarative-generative-ui/renderers";

// Needs useAgent()/useCopilotChatConfiguration(), which only resolve inside
// CopilotChatConfigurationProvider — wraps both chat and inbox since both use it.
function AgentSync({ children }: { children: ReactNode }) {
  useSyncSharedInboxWithAgent();
  useSyncSelfManagedThreadsWithAgent();
  return <>{children}</>;
}

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
    /* Uncontrolled provider: the threads menu drives the active thread directly (row picks it,
       "+ New" resets it) — chat and canvas both read it via useAgent(), no host wiring needed. */
    <CopilotChatConfigurationProvider agentId="default">
      <AgentSync>{body}</AgentSync>
    </CopilotChatConfigurationProvider>
  );
}

export default function App() {
  useSyncTheme();

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      // Read fresh per request (not React state) so saving a key takes effect
      // immediately — see agent/src/config/model.ts's getApiKeyFromConfig.
      headers={() => {
        const key = readStoredOpenAiKey();
        const headers: Record<string, string> = {};
        if (key) headers["x-openai-api-key"] = key;
        return headers;
      }}
      // Inert — positioning is forced via CSS override in globals.css instead;
      // left in place to state intent in case CopilotKit fixes the bug.
      inspectorDefaultAnchor={{ horizontal: "left", vertical: "bottom" }}
      a2ui={{ catalog: demonstrationCatalog }}
      openGenerativeUI={{}}
      useSingleEndpoint={false}
    >
      <OpenAiKeyGate>
        <Inbox />
      </OpenAiKeyGate>
    </CopilotKit>
  );
}
