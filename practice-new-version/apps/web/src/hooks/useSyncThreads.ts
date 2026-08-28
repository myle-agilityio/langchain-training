import { useEffect, useRef } from "react";
import {
  useAgent,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";
import { useSaveThread } from "@/hooks/useSelfManagedThreads";

// Loose shape instead of importing AbstractAgent/Message from @ag-ui/client directly — that
// package is only a transitive dependency here, not one of ours to import from.
interface AgentWithMessages {
  messages: ReadonlyArray<{ role?: string; content?: unknown }>;
}

// AG-UI message content is either a plain string or an array of parts (text/image, for
// attachments) — pull the first text part out of either shape.
const messageText = (message: {
  content?: unknown;
}): string | undefined => {
  const { content } = message;

  if (typeof content === "string") {
    return content;
  }

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
};

const firstUserMessageText = (agent: AgentWithMessages): string | undefined =>
  messageText(agent.messages.find((m) => m.role === "user") ?? {});

// Full-conversation snapshot the thread-search index is built from — every message's text,
// not just the first, so search finds a thread by anything said in it.
const allMessagesText = (agent: AgentWithMessages): string | undefined => {
  const text = agent.messages
    .map(messageText)
    .filter((part): part is string => Boolean(part))
    .join("\n");

  return text || undefined;
};

// Keeps the threads query in sync with the agent's run lifecycle; call once from a
// component inside CopilotChatConfigurationProvider.
export const useSyncThreads = () => {
  // updates: [] — only need the agent handle to subscribe to run completion below.
  const { agent } = useAgent({ updates: [] });
  const config = useCopilotChatConfiguration();
  const saveThread = useSaveThread();

  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Upsert the active thread when a run finishes: creates its row on first use (so an unused
  // "+ New chat" never litters the list) and bumps updated_at so the list stays sorted by activity.
  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onRunFinalized: () => {
        const threadId = configRef.current?.threadId;

        if (!threadId) {
          return;
        }

        saveThread({
          id: threadId,
          firstMessage: firstUserMessageText(agent),
          content: allMessagesText(agent),
        });
      },
    });

    return unsubscribe;
  }, [agent, saveThread]);
};
