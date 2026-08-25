import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { reportFailure } from "@/lib/errors";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) =>
      reportFailure(
        error,
        `query.${String(query.queryKey)}`,
        query.meta?.silent === true,
      ),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) =>
      reportFailure(
        error,
        `mutation.${mutation.options.mutationKey?.join(".") ?? "unknown"}`,
        mutation.meta?.silent === true,
      ),
  }),
  defaultOptions: {
    // Freshness is pushed by the agent's run lifecycle (useSyncInbox/useSyncThreads invalidate).
    queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 },
  },
});
