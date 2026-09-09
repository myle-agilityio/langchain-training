import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { ThreadsList } from "@/components/ThreadsList";

// Shown once the chat pane itself (ChatPanel's `@container`) has room for it — the button
// takes over below that width, on either tab. Always `flex`, never `hidden`, so the collapse
// animates via width/opacity instead of the display jump a breakpoint toggle would cause.
export const ThreadsSidebar = () => {
  const config = useCopilotChatConfiguration();

  if (!config) {
    return null;
  }

  return (
    <aside
      aria-label="Conversations"
      className="flex h-full w-0 shrink-0 flex-col overflow-hidden border-r-0 opacity-0 transition-all duration-300 ease-in-out @min-[1400px]:w-64 @min-[1400px]:border-r @min-[1400px]:border-border @min-[1400px]:opacity-100"
    >
      <ThreadsList className="h-full w-64" />
    </aside>
  );
};
