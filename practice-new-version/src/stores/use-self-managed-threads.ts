import { useEffect, useRef } from "react";
import { create } from "zustand";
import { useAgent, useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { readStoredOpenAiKey } from "@/stores/use-openai-key";
import type { ChatThread } from "@/types/thread";

interface SelfManagedThreadsState {
  threads: ChatThread[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  renameThread: (id: string, title: string) => Promise<void>;
  deleteThread: (id: string) => Promise<void>;
}

// Loose shape instead of importing AbstractAgent/Message from @ag-ui/client directly — that
// package is only a transitive dependency here, not one of ours to import from.
interface AgentWithMessages {
  messages: ReadonlyArray<{ role?: string; content?: unknown }>;
}

// AG-UI user message content is either a plain string or an array of parts (text/image, for
// attachments) — pull the first text part out of either shape.
function firstUserMessageText(agent: AgentWithMessages): string | undefined {
  const { content } = agent.messages.find((m) => m.role === "user") ?? {};
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textPart = content.find(
      (part) => typeof part === "object" && part !== null && (part as { type?: unknown }).type === "text",
    ) as { text?: string } | undefined;
    return textPart?.text;
  }
  return undefined;
}

// Stands in for CopilotKit's <CopilotThreadsDrawer>/useThreads, which require Intelligence
// mode (see vite.config.ts's VITE_COPILOTKIT_THREADS_ENABLED and the
// COPILOTKIT_LICENSE_TOKEN note in .env — that transport currently drops runs in production).
// Thread history itself already survives via the graph's Postgres checkpointer; this only adds
// the list/rename/delete UI on top, backed by a lightweight chat_threads table.
export const useSelfManagedThreads = create<SelfManagedThreadsState>((set, get) => ({
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
    set({ threads: previous.map((t) => (t.id === id ? { ...t, title } : t)) });
    try {
      const res = await fetch("/api/threads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title }),
      });
      if (!res.ok) throw new Error(`PATCH /api/threads failed (${res.status})`);
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
      const res = await fetch(`/api/threads?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE /api/threads failed (${res.status})`);
    } catch (error) {
      console.error(`Failed to delete thread ${id}, reverting:`, error);
      set({ threads: previous });
    }
  },
}));

// Keeps the store in sync with the agent's run lifecycle. Needs useAgent()/
// useCopilotChatConfiguration(), which only resolve inside CopilotChatConfigurationProvider —
// call this once from a component in that subtree.
export function useSyncSelfManagedThreadsWithAgent() {
  // updates: [] — only need the agent handle to subscribe to run completion below.
  const { agent } = useAgent({ updates: [] });
  const config = useCopilotChatConfiguration();
  const refresh = useSelfManagedThreads((state) => state.refresh);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const configRef = useRef(config);
  configRef.current = config;

  // Upsert the active thread every time a run on it finishes: creates its row on first use
  // (so an unused "+ New chat" never litters the list), titling it from the first user
  // message server-side, and bumps updated_at on every later turn so the list stays sorted
  // by actual activity.
  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onRunFinalized: () => {
        const threadId = configRef.current?.threadId;
        if (!threadId) return;
        const openaiKey = readStoredOpenAiKey();
        fetch("/api/threads", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(openaiKey ? { "x-openai-api-key": openaiKey } : {}),
          },
          body: JSON.stringify({ id: threadId, firstMessage: firstUserMessageText(agent) }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`POST /api/threads failed (${res.status})`);
          })
          .catch((error) => console.error("Failed to save thread:", error))
          .finally(() => refresh());
      },
    });
    return unsubscribe;
  }, [agent, refresh]);
}
