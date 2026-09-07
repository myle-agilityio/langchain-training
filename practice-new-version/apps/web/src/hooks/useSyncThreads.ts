import { useEffect, useRef } from "react";
import {
  useAgent,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";
import { useSaveThread } from "@/hooks/useSelfManagedThreads";
import { messageText, type AgentMessage } from "@/utils";

interface AgentWithMessages {
  messages: ReadonlyArray<AgentMessage>;
}

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
          messages: agent.messages,
        });
      },
    });

    return unsubscribe;
  }, [agent, saveThread]);
};
