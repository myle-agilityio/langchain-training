import { create } from "zustand";
import type { ChatThread } from "@/types/thread";

interface SelfManagedThreadsState {
  threads: ChatThread[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  renameThread: (id: string, title: string) => Promise<void>;
  deleteThread: (id: string) => Promise<void>;
}

// Stands in for CopilotKit's <CopilotThreadsDrawer>/useThreads (Intelligence mode drops runs
// in prod). History survives via the Postgres checkpointer; this just adds list/rename/delete UI.
export const useSelfManagedThreads = create<SelfManagedThreadsState>(
  (set, get) => ({
    threads: [],
    isLoading: true,

    refresh: async () => {
      try {
        const res = await fetch("/api/threads");
        if (!res.ok) throw new Error(`GET /api/threads failed (${res.status})`);
        const data = (await res.json()) as { threads: ChatThread[] };
        set({ threads: data.threads });
      } catch (error) {
        console.error("Failed to refresh threads:", error);
      } finally {
        set({ isLoading: false });
      }
    },

    renameThread: async (id, title) => {
      const previous = get().threads;
      set({
        threads: previous.map((t) => (t.id === id ? { ...t, title } : t)),
      });
      try {
        const res = await fetch("/api/threads", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, title }),
        });
        if (!res.ok)
          throw new Error(`PATCH /api/threads failed (${res.status})`);
        await get().refresh();
      } catch (error) {
        console.error(`Failed to rename thread ${id}, reverting:`, error);
        set({ threads: previous });
      }
    },

    deleteThread: async (id) => {
      const previous = get().threads;
      set({ threads: previous.filter((t) => t.id !== id) });
      try {
        const res = await fetch(`/api/threads?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok)
          throw new Error(`DELETE /api/threads failed (${res.status})`);
      } catch (error) {
        console.error(`Failed to delete thread ${id}, reverting:`, error);
        set({ threads: previous });
      }
    },
  }),
);
