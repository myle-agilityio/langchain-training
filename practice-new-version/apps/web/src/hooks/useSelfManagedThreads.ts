import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchThreads, renameThread, deleteThread, saveThread } from "@/api";
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
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameThread(id, title),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey: threadsQueryKey });
      const previous = queryClient.getQueryData<ChatThread[]>(threadsQueryKey);
      queryClient.setQueryData<ChatThread[]>(threadsQueryKey, (old) =>
        (old ?? []).map((thread) =>
          thread.id === id ? { ...thread, title } : thread,
        ),
      );
      return { previous };
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: threadsQueryKey }),
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(threadsQueryKey, context?.previous),
  });

  return useCallback(
    (id: string, title: string) => mutate({ id, title }),
    [mutate],
  );
};

export const useDeleteThread = () => {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: deleteThread,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: threadsQueryKey });
      const previous = queryClient.getQueryData<ChatThread[]>(threadsQueryKey);
      queryClient.setQueryData<ChatThread[]>(threadsQueryKey, (old) =>
        (old ?? []).filter((thread) => thread.id !== id),
      );
      return { previous };
    },
    onError: (_error, _variables, context) =>
      queryClient.setQueryData(threadsQueryKey, context?.previous),
  });

  return mutate;
};

// Upsert of the active thread once a run finishes — see useSyncThreads.
export const useSaveThread = () => {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    // Read at call time, not render time: the teacher can change the key mid-session.
    mutationFn: (body: { id: string; firstMessage?: string }) =>
      saveThread(body, useOpenAIKey.getState().apiKey),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: threadsQueryKey }),
  });

  return mutate;
};
