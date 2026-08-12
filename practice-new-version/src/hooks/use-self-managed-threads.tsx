"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAgent, useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { readStoredOpenAiKey } from "@/hooks/use-openai-key";
import type { ChatThread } from "@/types/thread";

interface SelfManagedThreadsValue {
  threads: ChatThread[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  renameThread: (id: string, title: string) => Promise<void>;
  deleteThread: (id: string) => Promise<void>;
}

const SelfManagedThreadsContext = createContext<SelfManagedThreadsValue | null>(null);

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
export function SelfManagedThreadsProvider({ children }: { children: ReactNode }) {
  // updates: [] — only need the agent handle to subscribe to run completion below.
  const { agent } = useAgent({ updates: [] });
  const config = useCopilotChatConfiguration();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/threads");
      if (!res.ok) return;
      const data = (await res.json()) as { threads: ChatThread[] };
      setThreads(data.threads);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

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
        }).then(() => refreshRef.current());
      },
    });
    return unsubscribe;
  }, [agent]);

  const renameThread = useCallback(async (id: string, title: string) => {
    setThreads((current) => current.map((t) => (t.id === id ? { ...t, title } : t)));
    await fetch("/api/threads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
    await refreshRef.current();
  }, []);

  const deleteThread = useCallback(async (id: string) => {
    setThreads((current) => current.filter((t) => t.id !== id));
    await fetch(`/api/threads?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }, []);

  const value = useMemo(
    () => ({ threads, isLoading, refresh, renameThread, deleteThread }),
    [threads, isLoading, refresh, renameThread, deleteThread],
  );

  return (
    <SelfManagedThreadsContext.Provider value={value}>
      {children}
    </SelfManagedThreadsContext.Provider>
  );
}

export function useSelfManagedThreads(): SelfManagedThreadsValue {
  const ctx = useContext(SelfManagedThreadsContext);
  if (!ctx) {
    throw new Error("useSelfManagedThreads must be used within a SelfManagedThreadsProvider");
  }
  return ctx;
}
