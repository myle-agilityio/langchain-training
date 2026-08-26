import { useCallback, useMemo } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  fetchThreads,
  renameThread,
  deleteThread,
  saveThread,
  type ThreadsPage,
} from "@/api";
import { optimisticContext, rollback } from "@/lib";
import type { ChatThread } from "@/types";
import { useOpenAIKey } from "@/stores";

export const threadsQueryKey = ["threads"] as const;

const EMPTY: ChatThread[] = [];

type ThreadsData = InfiniteData<ThreadsPage, number>;

// Stands in for CopilotKit's <CopilotThreadsDrawer>/useThreads (Intelligence mode drops runs
// in prod). History survives via the Postgres checkpointer; this just adds list/rename/delete UI.
export const useSelfManagedThreads = () => {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: threadsQueryKey,
      queryFn: ({ pageParam }) => fetchThreads(pageParam),
      initialPageParam: 0,
      getNextPageParam: (lastPage, pages) =>
        lastPage.hasNext
          ? pages.reduce((count, page) => count + page.threads.length, 0)
          : undefined,
    });

  const threads = useMemo(
    () => data?.pages.flatMap((page) => page.threads) ?? EMPTY,
    [data],
  );

  return {
    threads,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
  };
};

const applyToThreads =
  (updater: (threads: ChatThread[]) => ChatThread[]) =>
  (old?: ThreadsData): ThreadsData | undefined => {
    if (!old) {
      return old;
    }

    // Renaming/deleting doesn't change which page a thread belongs to, so each page's threads
    // can be updated independently — no need to re-flatten and re-paginate.
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        threads: updater(page.threads),
      })),
    };
  };

export const useRenameThread = () => {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationKey: ["threads", "rename"],
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameThread(id, title),
    onMutate: ({ id, title }) =>
      optimisticContext<ThreadsData>(
        queryClient,
        threadsQueryKey,
        applyToThreads((threads) =>
          threads.map((thread) =>
            thread.id === id ? { ...thread, title } : thread,
          ),
        ),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: threadsQueryKey }),
    onError: (_error, _variables, context) =>
      rollback<ThreadsData>(queryClient, threadsQueryKey, context),
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
      optimisticContext<ThreadsData>(
        queryClient,
        threadsQueryKey,
        applyToThreads((threads) =>
          threads.filter((thread) => thread.id !== id),
        ),
      ),
    onError: (_error, _variables, context) =>
      rollback<ThreadsData>(queryClient, threadsQueryKey, context),
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
