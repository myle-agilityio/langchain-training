import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchThreads, renameThread, deleteThread, saveThread } from "@/api";
import { optimisticContext, rollback } from "@/lib/optimistic";
import type { ChatThread } from "@/types";
import { useOpenAIKey } from "@/stores";

export const threadsQueryKey = ["threads"] as const;

const EMPTY: ChatThread[] = [];

// Stands in for CopilotKit's <CopilotThreadsDrawer>/useThreads (Intelligence mode drops runs
// in prod). History survives via the Postgres checkpointer; this just adds list/rename/delete UI.
export const useSelfManagedThreads = (): ChatThread[] => {
  const { data } = useQuery({
    queryKey: threadsQueryKey,
    queryFn: fetchThreads,
  });
  return data ?? EMPTY;
};

export const useRenameThread = () => {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationKey: ["threads", "rename"],
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameThread(id, title),
    onMutate: ({ id, title }) =>
      optimisticContext<ChatThread[]>(queryClient, threadsQueryKey, (old) =>
        (old ?? []).map((thread) =>
          thread.id === id ? { ...thread, title } : thread,
        ),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: threadsQueryKey }),
    onError: (_error, _variables, context) =>
      rollback<ChatThread[]>(queryClient, threadsQueryKey, context),
  });

  return useCallback(
    (id: string, title: string) => mutate({ id, title }),
    [mutate],
  );
};

export const useDeleteThread = () => {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationKey: ["threads", "delete"],
    mutationFn: deleteThread,
    onMutate: (id) =>
      optimisticContext<ChatThread[]>(queryClient, threadsQueryKey, (old) =>
        (old ?? []).filter((thread) => thread.id !== id),
      ),
    onError: (_error, _variables, context) =>
      rollback<ChatThread[]>(queryClient, threadsQueryKey, context),
  });

  return mutate;
};

// Upsert of the active thread once a run finishes — see useSyncThreads.
export const useSaveThread = () => {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationKey: ["threads", "save"],
    // Background upsert after a run — a failed title write shouldn't interrupt the teacher.
    meta: { silent: true },
    // Read at call time, not render time: the teacher can change the key mid-session.
    mutationFn: (body: { id: string; firstMessage?: string }) =>
      saveThread(body, useOpenAIKey.getState().apiKey),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: threadsQueryKey }),
  });

  return mutate;
};
