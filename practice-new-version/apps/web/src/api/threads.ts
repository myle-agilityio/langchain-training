import { OPENAI_API_KEY_HEADER, THREADS_PAGE_SIZE } from "@/constants";
import type { ChatThread } from "@/types";
import { apiClient } from "./client";

const THREADS_PATH = "/api/threads";

export interface ThreadsPage {
  threads: ChatThread[];
  hasNext: boolean;
}

export const fetchThreads = async (offset: number): Promise<ThreadsPage> =>
  (
    await apiClient.get<ThreadsPage>(THREADS_PATH, {
      params: { limit: THREADS_PAGE_SIZE, offset },
    })
  ).data;

// Upsert — creates the row on a thread's first touch, else just bumps updated_at. The key is
// the teacher's own (BYOK): the route spends it on the generated title.
export const saveThread = async (
  body: { id: string; firstMessage?: string },
  openaiKey?: string | null,
): Promise<void> => {
  await apiClient.post(THREADS_PATH, body, {
    headers: openaiKey ? { [OPENAI_API_KEY_HEADER]: openaiKey } : undefined,
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
