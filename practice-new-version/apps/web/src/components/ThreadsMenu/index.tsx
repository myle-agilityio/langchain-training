import { useState } from "react";
import { Clock, SquarePen } from "lucide-react";
import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import {
  useSelfManagedThreads,
  useRenameThread,
  useDeleteThread,
} from "@/hooks";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/common";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/formatDate";

// Clock-icon trigger + dropdown replacement for the old full-height SelfManagedThreadsDrawer —
// same data/actions, just a popover; outside-click-to-close comes free from Radix.
export const ThreadsMenu = () => {
  const config = useCopilotChatConfiguration();
  const threads = useSelfManagedThreads();
  const renameThread = useRenameThread();
  const deleteThread = useDeleteThread();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  if (!config) return null;

  const commitRename = (id: string) => {
    const title = draftTitle.trim();
    setEditingId(null);
    if (title) renameThread(id, title);
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setEditingId(null);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Conversation history"
          title="Conversation history"
        >
          <Clock className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <div className="p-2 border-b border-border">
          <button
            type="button"
            onClick={() => {
              config.startNewThread();
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-secondary cursor-pointer"
          >
            <SquarePen className="h-3.5 w-3.5" /> New chat
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto thin-scrollbar p-1">
          {threads.length === 0 && (
            <p className="px-2 py-4 text-sm text-muted-foreground">
              No conversations yet.
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {threads.map((thread) => {
              const active =
                config.hasExplicitThreadId && config.threadId === thread.id;
              return (
                <li key={thread.id} className="group">
                  <div
                    className={cn(
                      "flex cursor-pointer items-center gap-1 rounded-md px-2 py-2 text-sm",
                      active ? "bg-secondary" : "hover:bg-secondary",
                    )}
                    onClick={() => {
                      config.setActiveThreadId(thread.id, { explicit: true });
                      setOpen(false);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      {editingId === thread.id ? (
                        <input
                          autoFocus
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          onBlur={() => commitRename(thread.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(thread.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-transparent border-b border-border outline-none"
                        />
                      ) : (
                        <>
                          <div className="truncate">
                            {thread.title ?? "New conversation"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatRelative(thread.updatedAt)}
                          </div>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      title="Rename"
                      className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(thread.id);
                        setDraftTitle(thread.title ?? "");
                      }}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteThread(thread.id);
                        if (active) config.startNewThread();
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
