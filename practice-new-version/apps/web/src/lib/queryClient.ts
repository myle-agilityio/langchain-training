import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

// One log point for every failed request, so the hooks stay free of try/catch boilerplate.
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) =>
      console.error(`Query ${String(query.queryKey)} failed:`, error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => console.error("Mutation failed, rolling back:", error),
  }),
  defaultOptions: {
    // Freshness is pushed by the agent's run lifecycle (useSyncInbox/useSyncThreads invalidate).
    queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 },
  },
});
