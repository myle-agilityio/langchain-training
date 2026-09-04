import { THREADS_PAGE_SIZE } from "@/constants";
import { OPENAI_API_KEY_HEADER, USER_ID_HEADER } from "@repo/constants";
import type { ChatThread } from "@repo/types";
import { useUserId } from "@/stores";
import { apiClient } from "./client";

const THREADS_PATH = "/api/threads";

export interface ThreadsPage {
  threads: ChatThread[];
  hasNext: boolean;
}

// Scopes every /api/threads request to this browser's id — read at call time since it's a
// module-level function, not a component.
const userIdHeaders = () => ({ [USER_ID_HEADER]: useUserId.getState().userId });

export const fetchThreads = async (
  offset: number,
  search?: string,
): Promise<ThreadsPage> =>
  (
    await apiClient.get<ThreadsPage>(THREADS_PATH, {
      params: { limit: THREADS_PAGE_SIZE, offset, search },
      headers: userIdHeaders(),
    })
  ).data;

// Upsert — creates the row on a thread's first touch, else just bumps updated_at. The key is
// the teacher's own (BYOK): the route spends it on the generated title.
export const saveThread = async (
  body: { id: string; firstMessage?: string; content?: string },
  openaiKey?: string | null,
): Promise<void> => {
  await apiClient.post(THREADS_PATH, body, {
    headers: {
      ...userIdHeaders(),
      ...(openaiKey ? { [OPENAI_API_KEY_HEADER]: openaiKey } : {}),
    },
  });
};

export const renameThread = async (
  id: string,
  title: string,
): Promise<void> => {
  await apiClient.patch(
    THREADS_PATH,
    { id, title },
    { headers: userIdHeaders() },
  );
};

export const deleteThread = async (id: string): Promise<void> => {
  await apiClient.delete(THREADS_PATH, {
    params: { id },
    headers: userIdHeaders(),
  });
};
