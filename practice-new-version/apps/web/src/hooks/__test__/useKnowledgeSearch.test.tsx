import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api";
import { useOpenAIKey } from "@/stores";
import { useKnowledgeSearch } from "../useKnowledgeSearch";

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.restoreAllMocks();
  useOpenAIKey.setState({ apiKey: "sk-teacher" });
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

describe("useKnowledgeSearch", () => {
  it("returns the articles the route found", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { articles: [{ title: "Late work", content: "10% per day" }] },
    });

    const { result } = renderHook(() => useKnowledgeSearch("late work"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.articles).toEqual([
      { title: "Late work", content: "10% per day" },
    ]);
  });

  it("does not search without a query", () => {
    const get = vi.spyOn(apiClient, "get");

    const { result } = renderHook(() => useKnowledgeSearch(null), { wrapper });

    expect(get).not.toHaveBeenCalled();
    expect(result.current.articles).toEqual([]);
  });

  it("does not search without the teacher's key", () => {
    useOpenAIKey.setState({ apiKey: null });

    const get = vi.spyOn(apiClient, "get");

    renderHook(() => useKnowledgeSearch("late work"), { wrapper });

    expect(get).not.toHaveBeenCalled();
  });

  it("reports a failure inline rather than throwing it away", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useKnowledgeSearch("late work"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.articles).toEqual([]);
  });
});
