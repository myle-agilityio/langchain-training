import { useMemo, type ReactNode } from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { CopilotChatConfigurationProvider } from "@copilotkit/react-core/v2";
import { useOpenAiKey } from "@/stores";
import {
  // A2UI catalog: definitions + renderers in @/components/declarativeGenerativeUi/
  demonstrationCatalog,
  ChatSidebar,
  EmailChat,
  EmailInbox,
  ThreadsMenu,
} from "@/components";
import {
  useGenerativeUIExamples,
  useExampleSuggestions,
  useEmailAgent,
  useSyncComposeApproval,
  useSyncInbox,
  useSyncThreads,
  useSyncTheme,
} from "@/hooks";

// Needs useAgent()/useCopilotChatConfiguration(), which only resolve inside
// CopilotChatConfigurationProvider — wraps both chat and inbox since both use it.
const AgentSync = ({ children }: { children: ReactNode }) => {
  useSyncInbox();
  useSyncThreads();
  useSyncComposeApproval();
  return <>{children}</>;
};

const Inbox = () => {
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

const App = () => {
  useSyncTheme();
  // Subscribed, not read on demand: CopilotKit re-evaluates `headers` only when its own provider
  // re-renders, so without this a changed key kept using the old one until a reload.
  const apiKey = useOpenAiKey((s) => s.apiKey);
  const headers = useMemo(
    (): Record<string, string> =>
      apiKey ? { "x-openai-api-key": apiKey } : {},
    [apiKey],
  );

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      // Forwarded to the graph as copilotkit_forwarded_headers — see agent/src/config/model.ts.
      headers={headers}
      // Inert — positioning is forced via CSS override in globals.css instead;
      // left in place to state intent in case CopilotKit fixes the bug.
      inspectorDefaultAnchor={{ horizontal: "left", vertical: "bottom" }}
      a2ui={{ catalog: demonstrationCatalog }}
      openGenerativeUI={{}}
      useSingleEndpoint={false}
    >
      <Inbox />
    </CopilotKit>
  );
};

export default App;
