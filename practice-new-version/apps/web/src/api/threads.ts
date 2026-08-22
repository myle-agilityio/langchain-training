import type { ChatThread } from "@/types/thread";
import { apiFetch } from "./client";

const THREADS_PATH = "/api/threads";

export const fetchThreads = async (): Promise<ChatThread[]> =>
  (await apiFetch<{ threads: ChatThread[] }>(THREADS_PATH)).threads;

// Upsert — creates the row on a thread's first touch, else just bumps updated_at. The key is
// the teacher's own (BYOK): the route spends it on the generated title.
export const saveThread = async (
  body: { id: string; firstMessage?: string },
  openaiKey?: string | null,
): Promise<void> => {
  await apiFetch(THREADS_PATH, {
    method: "POST",
    headers: openaiKey ? { "x-openai-api-key": openaiKey } : undefined,
    json: body,
  });
};

export const renameThread = async (
  id: string,
  title: string,
): Promise<void> => {
  await apiFetch(THREADS_PATH, { method: "PATCH", json: { id, title } });
};

export const deleteThread = async (id: string): Promise<void> => {
  await apiFetch(`${THREADS_PATH}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};
