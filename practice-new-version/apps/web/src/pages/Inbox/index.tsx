import { useRef, useState, type CSSProperties } from "react";
import { CopilotChatConfigurationProvider } from "@copilotkit/react-core/v2";
import { AppHeader, ChatPanel, EmailInbox } from "@/components";
import { SplitDivider } from "@/components/common";
import {
  useEmailAgent,
  useChatSuggestions,
  useGenerativeUIExamples,
} from "@/hooks";
import { useSplitRatio, useViewMode } from "@/stores";
import { cn } from "@/utils";
import { AgentSync } from "./AgentSync";

export const Inbox = () => {
  useGenerativeUIExamples();
  useChatSuggestions();
  useEmailAgent();

  const mode = useViewMode((s) => s.mode);
  const isApp = mode === "app";

  const splitRef = useRef<HTMLDivElement>(null);
  const ratio = useSplitRatio((s) => s.ratio);
  const adjustRatio = useSplitRatio((s) => s.adjustRatio);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (deltaX: number) => {
    const width = splitRef.current?.offsetWidth;

    if (!width) {
      return;
    }

    adjustRatio(deltaX / width);
  };

  // Both panes stay mounted whichever tab is open — EmailInbox registers filterInbox/showEmail
  // and publishes the open email as agent context, which the chat tab still needs.
  const body = (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-canvas">
      <AppHeader />
      <div
        ref={splitRef}
        style={
          {
            "--chat-ratio": `${ratio * 100}%`,
            "--inbox-ratio": `${(1 - ratio) * 100}%`,
          } as CSSProperties
        }
        className="flex flex-1 min-h-0 w-full px-3 pb-3"
      >
        <div
          className={cn(
            "h-full min-w-0 flex flex-col overflow-hidden rounded-xl bg-panel",
            !isDragging && "transition-all duration-300 ease-in-out",
            isApp
              ? "w-0 opacity-0 lg:w-[var(--chat-ratio)] lg:opacity-100"
              : "w-full opacity-100",
          )}
        >
          <ChatPanel />
        </div>
        {isApp && (
          <SplitDivider
            className="hidden lg:flex"
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            onDrag={handleDrag}
          />
        )}
        <div
          className={cn(
            "h-full min-w-0 overflow-hidden rounded-xl bg-panel",
            !isDragging && "transition-all duration-300 ease-in-out",
            isApp
              ? "w-full opacity-100 lg:w-[var(--inbox-ratio)]"
              : "w-0 opacity-0",
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
