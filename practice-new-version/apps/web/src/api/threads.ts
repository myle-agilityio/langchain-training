import type { ChatThread } from "@/types/thread";
import { apiClient } from "./client";

const THREADS_PATH = "/api/threads";

export const fetchThreads = async (): Promise<ChatThread[]> =>
  (await apiClient.get<{ threads: ChatThread[] }>(THREADS_PATH)).data.threads;

// Upsert — creates the row on a thread's first touch, else just bumps updated_at. The key is
// the teacher's own (BYOK): the route spends it on the generated title.
export const saveThread = async (
  body: { id: string; firstMessage?: string },
  openaiKey?: string | null,
): Promise<void> => {
  await apiClient.post(THREADS_PATH, body, {
    headers: openaiKey ? { "x-openai-api-key": openaiKey } : undefined,
  });
};

export const renameThread = async (
  id: string,
  title: string,
): Promise<void> => {
  await apiClient.patch(THREADS_PATH, { id, title });
};

export const deleteThread = async (id: string): Promise<void> => {
  await apiClient.delete(THREADS_PATH, { params: { id } });
};
