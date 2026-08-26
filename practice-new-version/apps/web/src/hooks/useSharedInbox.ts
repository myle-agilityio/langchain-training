import { useCallback, useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { fetchEmails, patchEmail, patchEmails, type EmailsPage } from "@/api";
import { optimisticContext, rollback } from "@/lib";
import type { Email } from "@/types";

export const inboxQueryKey = ["emails"] as const;

const EMPTY: Email[] = [];

type EmailsData = InfiniteData<EmailsPage, number>;

// The inbox everything reads. Query's structural sharing keeps the array reference stable when a
// refetch returns identical data — load-bearing: a fresh one on onRunFinalized's refetch can feed
// back into another finalize cycle and trip "Maximum update depth exceeded".
export const useSharedInbox = () => {
  const {
    data,
    isPending,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: inboxQueryKey,
    queryFn: ({ pageParam }) => fetchEmails(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasNext
        ? pages.reduce((count, page) => count + page.emails.length, 0)
        : undefined,
  });

  const emails = useMemo(
    () => data?.pages.flatMap((page) => page.emails) ?? EMPTY,
    [data],
  );

  // Manual-refresh spinner only — isFetching would also spin on the silent onRunFinalized refetch.
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  return {
    emails,
    isLoading: isPending,
    isRefreshing,
    refresh,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
  };
};

const applyPatch =
  (ids: Set<string>, patch: Partial<Email>) =>
  (old?: EmailsData): EmailsData | undefined => {
    if (!old) {
      return old;
    }

    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        emails: page.emails.map((email) =>
          ids.has(email.id) ? { ...email, ...patch } : email,
        ),
      })),
    };
  };

const replaceEmails =
  (updated: Email[]) =>
  (old?: EmailsData): EmailsData | undefined => {
    if (!old) {
      return old;
    }

    const byId = new Map(updated.map((email) => [email.id, email]));

    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        emails: page.emails.map((email) => byId.get(email.id) ?? email),
      })),
    };
  };

// Separate hooks per mutation so a component that only writes (EmailReplyCard) doesn't
// subscribe to the inbox data and re-render on every refetch.
export const usePatchEmail = () => {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationKey: ["emails", "patch"],
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Email> }) =>
      patchEmail(id, patch),
    onMutate: ({ id, patch }) =>
      optimisticContext<EmailsData>(
        queryClient,
        inboxQueryKey,
        applyPatch(new Set([id]), patch),
      ),
    // The server echoes the saved row, so write that instead of spending a refetch on it.
    onSuccess: (email) =>
      queryClient.setQueryData<EmailsData>(
        inboxQueryKey,
        replaceEmails([email]),
      ),
    // Logging and the toast happen once in queryClient.ts — this only undoes the optimism.
    onError: (_error, _variables, context) =>
      rollback<EmailsData>(queryClient, inboxQueryKey, context),
  });

  return useCallback(
    (id: string, patch: Partial<Email>) => mutate({ id, patch }),
    [mutate],
  );
};

export const usePatchEmails = () => {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationKey: ["emails", "patchMany"],
    mutationFn: ({ ids, patch }: { ids: string[]; patch: Partial<Email> }) =>
      patchEmails(ids, patch),
    onMutate: ({ ids, patch }) =>
      optimisticContext<EmailsData>(
        queryClient,
        inboxQueryKey,
        applyPatch(new Set(ids), patch),
      ),
    onSuccess: (emails) =>
      queryClient.setQueryData<EmailsData>(
        inboxQueryKey,
        replaceEmails(emails),
      ),
    // Logging and the toast happen once in queryClient.ts — this only undoes the optimism.
    onError: (_error, _variables, context) =>
      rollback<EmailsData>(queryClient, inboxQueryKey, context),
  });

  return useCallback(
    (ids: string[], patch: Partial<Email>) => {
      if (ids.length > 0) {
        mutate({ ids, patch });
      }
    },
    [mutate],
  );
};
