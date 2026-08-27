import { useQuery } from "@tanstack/react-query";
import { searchKnowledgeBase } from "@/api";
import { useOpenAIKey } from "@/stores";

// Same articles across re-renders of the same email — no reason to refetch on remount.
export const useKnowledgeSearch = (query: string | null) => {
  const apiKey = useOpenAIKey((s) => s.apiKey);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["knowledge", query],
    queryFn: () => searchKnowledgeBase(query as string, apiKey),
    enabled: Boolean(query) && Boolean(apiKey),
    staleTime: Infinity,
    // A failed background lookup shouldn't toast — RelatedArticles shows its own inline message.
    meta: { silent: true },
  });

  return { articles: data ?? [], isLoading, isError };
};
