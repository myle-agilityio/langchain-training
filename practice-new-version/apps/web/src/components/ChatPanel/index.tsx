import { useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { EmailChat } from "@/components/EmailChat";
import { ModelPicker } from "@/components/ModelPicker";
import { ChangeKeyButton } from "@/components/openAIKey";
import { ThreadsSidebar } from "@/components/ThreadsSidebar";
import { Button } from "@/components/common";

// The chat pane: model, key and history belong to the conversation, so they sit in this
// toolbar rather than the app-wide header. The history sidebar is a plain manual toggle, open by
// default — `isSidebarOpen` is the one flag both ThreadsSidebar's width and the two toggle
// buttons key off (expand here while collapsed, collapse beside "New chat" while open — see
// ThreadsSidebar/ThreadsList). Both the sidebar and the chat column keep a min-width so neither
// gets cut when space is tight; the pane scrolls horizontally instead.
export const ChatPanel = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((open) => !open);

  return (
    <div className="flex h-full w-full overflow-x-auto overflow-y-hidden">
      <ThreadsSidebar open={isSidebarOpen} onCollapse={toggleSidebar} />
      <div className="flex h-full min-w-72 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 flex items-center gap-1 px-4 pt-3">
          {!isSidebarOpen && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Expand conversation history"
              title="Expand conversation history"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          )}
          {/* ml-auto rather than a justify-between sibling: this stays pinned to the right edge
              whether or not the expand button above is rendered. */}
          <div className="ml-auto flex items-center gap-1">
            <ModelPicker />
            <ChangeKeyButton />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pb-3">
          <EmailChat />
        </div>
      </div>
    </div>
  );
};
