import { EmailChat } from "@/components/EmailChat";
import { ModelPicker } from "@/components/ModelPicker";
import { ChangeKeyButton } from "@/components/openAIKey";
import { ThreadsMenu } from "@/components/ThreadsMenu";
import { ThreadsSidebar } from "@/components/ThreadsSidebar";
import { useViewMode } from "@/stores";
import { cn } from "@/utils";

// The chat pane: model, key and history belong to the conversation, so they sit in this
// toolbar rather than the app-wide header. On the chat tab the history opens as a sidebar
// instead — the button stays only where that sidebar doesn't fit.
export const ChatPanel = () => {
  const isChat = useViewMode((s) => s.mode) === "chat";

  return (
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
        {/* Only the messages center to `max-w-4xl` on the chat tab — the toolbar above stays
            full width so its icons sit at the card's right edge, not the centered column's. */}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto pb-3",
            isChat && "mx-auto w-full max-w-4xl",
          )}
        >
          <EmailChat />
        </div>
      </div>
    </div>
  );
};
