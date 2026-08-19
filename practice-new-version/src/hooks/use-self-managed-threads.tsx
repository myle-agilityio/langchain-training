import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAgent,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";
import { readStoredOpenAiKey } from "@/hooks/use-openai-key";
import type { ChatThread } from "@/types/thread";

interface SelfManagedThreadsValue {
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
      (part) =>
        typeof part === "object" &&
        part !== null &&
        (part as { type?: unknown }).type === "text",
    ) as { text?: string } | undefined;
    return textPart?.text;
  }
  return undefined;
}

// Stands in for CopilotKit's <CopilotThreadsDrawer>/useThreads (Intelligence mode drops runs
// in prod). History survives via the Postgres checkpointer; this just adds list/rename/delete UI.
export function useSelfManagedThreads(): SelfManagedThreadsValue {
  // updates: [] — only need the agent handle to subscribe to run completion below.
  const { agent } = useAgent({ updates: [] });
  const config = useCopilotChatConfiguration();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/threads");
      if (!res.ok) throw new Error(`GET /api/threads failed (${res.status})`);
      const data = (await res.json()) as { threads: ChatThread[] };
      setThreads(data.threads);
    } catch (error) {
      console.error("Failed to refresh threads:", error);
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

  // Upsert the active thread when a run finishes: creates its row on first use (so an unused
  // "+ New chat" never litters the list) and bumps updated_at so the list stays sorted by activity.
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
          body: JSON.stringify({
            id: threadId,
            firstMessage: firstUserMessageText(agent),
          }),
        })
          .then((res) => {
            if (!res.ok)
              throw new Error(`POST /api/threads failed (${res.status})`);
          })
          .catch((error) => console.error("Failed to save thread:", error))
          .finally(() => refreshRef.current());
      },
    });
    return unsubscribe;
  }, [agent]);

  const renameThread = useCallback(async (id: string, title: string) => {
    let previous: ChatThread[] = [];
    setThreads((current) => {
      previous = current;
      return current.map((t) => (t.id === id ? { ...t, title } : t));
    });
    try {
      const res = await fetch("/api/threads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title }),
      });
      if (!res.ok) throw new Error(`PATCH /api/threads failed (${res.status})`);
      await refreshRef.current();
    } catch (error) {
      console.error(`Failed to rename thread ${id}, reverting:`, error);
      setThreads(previous);
    }
  }, []);

  const deleteThread = useCallback(async (id: string) => {
    let previous: ChatThread[] = [];
    setThreads((current) => {
      previous = current;
      return current.filter((t) => t.id !== id);
    });
    try {
      const res = await fetch(`/api/threads?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok)
        throw new Error(`DELETE /api/threads failed (${res.status})`);
    } catch (error) {
      console.error(`Failed to delete thread ${id}, reverting:`, error);
      setThreads(previous);
    }
  }, []);

  return useMemo(
    () => ({ threads, isLoading, refresh, renameThread, deleteThread }),
    [threads, isLoading, refresh, renameThread, deleteThread],
  );
}
