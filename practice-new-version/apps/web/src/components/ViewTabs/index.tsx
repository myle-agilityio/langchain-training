import { Inbox as InboxIcon, MessageSquare } from "lucide-react";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { useViewMode, type ViewMode } from "@/stores";
import { cn } from "@/utils";

const TABS = [
  { mode: "chat", label: "Chat", icon: MessageSquare },
  { mode: "app", label: "App", icon: InboxIcon },
] as const satisfies ReadonlyArray<{
  mode: ViewMode;
  label: string;
  icon: typeof MessageSquare;
}>;

// The window's two tabs: chat alone, or chat beside the inbox.
export const ViewTabs = () => {
  const mode = useViewMode((s) => s.mode);
  const setMode = useViewMode((s) => s.setMode);

  useFrontendTool({
    name: "enableChatMode",
    description:
      "Switch the teacher's window to the Chat tab, where the conversation fills the window " +
      "and the inbox is hidden. Only for when they ask to focus on the chat — showing or " +
      "filtering emails already switches to the App tab on its own.",
    handler: async () => setMode("chat"),
  });

  useFrontendTool({
    name: "enableAppMode",
    description:
      "Switch the teacher's window to the App tab, putting the inbox beside the chat.",
    handler: async () => setMode("app"),
  });

  return (
    <div
      role="tablist"
      aria-label="View mode"
      className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5"
    >
      {TABS.map(({ mode: value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={mode === value}
          onClick={() => setMode(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
            mode === value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
};
