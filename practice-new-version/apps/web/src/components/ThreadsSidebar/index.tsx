import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { ThreadsList } from "@/components/ThreadsList";

// The chat tab has the room for the conversation list to stay open, so it lives here instead of
// behind the ThreadsMenu button. Hidden on narrow screens, where the button takes over again.
export const ThreadsSidebar = () => {
  const config = useCopilotChatConfiguration();

  if (!config) {
    return null;
  }

  return (
    <aside
      aria-label="Conversations"
      className="hidden md:flex h-full w-64 shrink-0 flex-col border-r border-border"
    >
      <ThreadsList className="h-full" />
    </aside>
  );
};
