import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { toApiError } from "@/lib/errors";
import { logError } from "@/lib/logger";
import { toast } from "@/stores";

// The one place a failed request becomes visible: a structured log for us, a toast for the
// teacher. Pass meta.silent on a query that fails in the background and shouldn't interrupt.
const handle = (error: unknown, source: string, silent?: boolean) => {
  const apiError = toApiError(error);
  logError(source, {
    code: apiError.code,
    status: apiError.status,
    requestId: apiError.requestId,
    detail: apiError.message,
  });
  if (!silent) toast.error(apiError.userMessage);
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) =>
      handle(
        error,
        `query.${String(query.queryKey)}`,
        query.meta?.silent === true,
      ),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) =>
      handle(
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
