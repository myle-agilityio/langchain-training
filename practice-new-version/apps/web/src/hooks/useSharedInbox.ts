import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchEmails, patchEmail, patchEmails } from "@/api";
import { optimisticContext, rollback } from "@/lib";
import type { Email } from "@/types";

export const inboxQueryKey = ["emails"] as const;

const EMPTY: Email[] = [];

// The inbox everything reads. Query's structural sharing keeps the array reference stable when a
// refetch returns identical data — load-bearing: a fresh one on onRunFinalized's refetch can feed
// back into another finalize cycle and trip "Maximum update depth exceeded".
export const useSharedInbox = () => {
  const { data, isPending, refetch } = useQuery({
    queryKey: inboxQueryKey,
    queryFn: fetchEmails,
  });

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

  return { emails: data ?? EMPTY, isLoading: isPending, isRefreshing, refresh };
};

const applyPatch =
  (ids: Set<string>, patch: Partial<Email>) => (old?: Email[]) =>
    (old ?? []).map((email) =>
      ids.has(email.id) ? { ...email, ...patch } : email,
    );

const replaceEmails = (updated: Email[]) => (old?: Email[]) => {
  const byId = new Map(updated.map((email) => [email.id, email]));

  return (old ?? []).map((email) => byId.get(email.id) ?? email);
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
      optimisticContext<Email[]>(
        queryClient,
        inboxQueryKey,
        applyPatch(new Set([id]), patch),
      ),
    // The server echoes the saved row, so write that instead of spending a refetch on it.
    onSuccess: (email) =>
      queryClient.setQueryData<Email[]>(inboxQueryKey, replaceEmails([email])),
    // Logging and the toast happen once in queryClient.ts — this only undoes the optimism.
    onError: (_error, _variables, context) =>
      rollback<Email[]>(queryClient, inboxQueryKey, context),
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
      optimisticContext<Email[]>(
        queryClient,
        inboxQueryKey,
        applyPatch(new Set(ids), patch),
      ),
    onSuccess: (emails) =>
      queryClient.setQueryData<Email[]>(inboxQueryKey, replaceEmails(emails)),
    // Logging and the toast happen once in queryClient.ts — this only undoes the optimism.
    onError: (_error, _variables, context) =>
      rollback<Email[]>(queryClient, inboxQueryKey, context),
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
