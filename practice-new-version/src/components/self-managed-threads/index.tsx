"use client";

import { useState } from "react";
import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { useSelfManagedThreads } from "@/hooks/use-self-managed-threads";

function formatRelative(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Fallback for <CopilotThreadsDrawer> when Intelligence mode isn't available — see the
// SelfManagedThreadsProvider doc comment for why. Fills the same reserved grid column
// (`--cpk-drawer-reserved-width`, page.module.css) so no layout changes are needed.
export function SelfManagedThreadsDrawer() {
  const config = useCopilotChatConfiguration();
  const { threads, renameThread, deleteThread } = useSelfManagedThreads();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  if (!config) return null;

  const commitRename = (id: string) => {
    const title = draftTitle.trim();
    setEditingId(null);
    if (title) renameThread(id, title);
  };

  return (
    <div className="w-full h-full flex flex-col border-r border-stone-200 dark:border-stone-800 dark:bg-stone-950">
      <div className="shrink-0 p-3">
        <button
          type="button"
          onClick={() => config.startNewThread()}
          className="w-full rounded-md border border-stone-300 dark:border-stone-700 px-3 py-2 text-sm font-medium hover:bg-stone-100 dark:hover:bg-stone-900"
        >
          + New chat
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
        {threads.length === 0 && (
          <p className="px-2 py-4 text-sm text-stone-500">No conversations yet.</p>
        )}
        <ul className="flex flex-col gap-0.5">
          {threads.map((thread) => {
            const active = config.hasExplicitThreadId && config.threadId === thread.id;
            return (
              <li key={thread.id} className="group">
                <div
                  className={`flex items-center gap-1 rounded-md px-2 py-2 cursor-pointer text-sm ${
                    active
                      ? "bg-stone-200 dark:bg-stone-800"
                      : "hover:bg-stone-100 dark:hover:bg-stone-900"
                  }`}
                  onClick={() => config.setActiveThreadId(thread.id, { explicit: true })}
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
                        className="w-full bg-transparent border-b border-stone-400 outline-none"
                      />
                    ) : (
                      <>
                        <div className="truncate">{thread.title ?? "New conversation"}</div>
                        <div className="text-xs text-stone-500">
                          {formatRelative(thread.updatedAt)}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    title="Rename"
                    className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
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
                    className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-stone-500 hover:text-red-600"
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
    </div>
  );
}
