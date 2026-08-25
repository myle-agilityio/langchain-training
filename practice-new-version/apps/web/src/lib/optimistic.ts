import type { QueryClient } from "@tanstack/react-query";

// Shared optimistic-write plumbing for the mutation hooks: snapshot, apply, and roll back to
// exactly what was there — never to `undefined`, which would blank the list on any failure.
export const optimisticContext = async <T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  updater: (old: T | undefined) => T | undefined,
) => {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<T>(queryKey);
  queryClient.setQueryData<T>(queryKey, updater);
  return { previous };
};

export const rollback = <T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  context?: { previous?: T },
) => {
  if (context?.previous !== undefined) {
    queryClient.setQueryData<T>(queryKey, context.previous);
  }
};
