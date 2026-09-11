import { EmailChat } from "@/components/EmailChat";
import { ModelPicker } from "@/components/ModelPicker";
import { ChangeKeyButton } from "@/components/openAIKey";
import { ThreadsMenu } from "@/components/ThreadsMenu";
import { ThreadsSidebar } from "@/components/ThreadsSidebar";

// The chat pane: model, key and history belong to the conversation, so they sit in this
// toolbar rather than the app-wide header. On the chat tab the history opens as a sidebar
// instead — the button stays only where that sidebar doesn't fit.
export const ChatPanel = () => (
  <div className="@container flex h-full w-full overflow-hidden">
    <ThreadsSidebar />
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-end gap-1 px-4 pt-3">
        <div className="@min-[1400px]:hidden">
          <ThreadsMenu />
        </div>
        <ModelPicker />
        <ChangeKeyButton />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto pb-3">
        <EmailChat />
      </div>
    </div>
  </div>
);
