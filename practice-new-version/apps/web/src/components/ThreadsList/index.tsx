import { useState } from "react";
import { Loader2, Pencil, Search, SquarePen, X } from "lucide-react";
import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import {
  useSelfManagedThreads,
  useRenameThread,
  useDeleteThread,
  useLoadMoreSentinel,
} from "@/hooks";
import { Input } from "@/components/common";
import { cn, formatRelative } from "@/utils";

interface ThreadsListProps {
  // Lets a host that overlays the page (the dropdown) close itself once a thread is picked.
  onPicked?: () => void;
  className?: string;
}

// The conversation list itself — shared by the ThreadsMenu dropdown and the ThreadsSidebar.
export const ThreadsList = ({ onPicked, className }: ThreadsListProps) => {
  const config = useCopilotChatConfiguration();
  const [search, setSearch] = useState("");
  const { threads, loadMore, hasMore, isLoadingMore } =
    useSelfManagedThreads(search);
  const renameThread = useRenameThread();
  const deleteThread = useDeleteThread();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const sentinelRef = useLoadMoreSentinel(hasMore, loadMore);

  if (!config) {
    return null;
  }

  const commitRename = (id: string) => {
    const title = draftTitle.trim();

    setEditingId(null);

    if (title) {
      renameThread(id, title);
    }
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="p-2 border-b border-border">
        <button
          type="button"
          onClick={() => {
            config.startNewThread();
            onPicked?.();
          }}
          className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-secondary cursor-pointer"
        >
          <SquarePen className="h-3.5 w-3.5" /> New chat
        </button>
      </div>
      <div className="p-2 border-b border-border relative">
        <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations…"
          className="h-8 pl-7 text-sm"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-1">
        {threads.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            {search.trim()
              ? "No matching conversations."
              : "No conversations yet."}
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
                    onPicked?.();
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
                          if (e.key === "Enter") {
                            commitRename(thread.id);
                          }

                          if (e.key === "Escape") {
                            setEditingId(null);
                          }
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
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-muted-foreground hover:text-destructive cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteThread(thread.id);

                      if (active) {
                        config.startNewThread();
                      }
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {threads.length > 0 && hasMore && (
          <div
            ref={sentinelRef}
            className="flex items-center justify-center py-2"
          >
            {isLoadingMore && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
