import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { ThreadsList } from "@/components/ThreadsList";
import { cn } from "@/utils";

interface ThreadsSidebarProps {
  open: boolean;
  // Collapses the sidebar — wired to the button ThreadsList renders beside "New chat" while open.
  onCollapse: () => void;
}

export const ThreadsSidebar = ({ open, onCollapse }: ThreadsSidebarProps) => {
  const config = useCopilotChatConfiguration();

  if (!config) {
    return null;
  }

  return (
    <aside
      aria-label="Conversations"
      className={cn(
        "flex h-full shrink-0 flex-col overflow-hidden transition-all duration-300 ease-in-out",
        open
          ? "w-64 min-w-64 border-r border-border opacity-100"
          : "w-0 min-w-0 border-r-0 opacity-0",
      )}
    >
      <ThreadsList
        className="flex-1 min-h-0"
        onCollapse={open ? onCollapse : undefined}
      />
    </aside>
  );
};
