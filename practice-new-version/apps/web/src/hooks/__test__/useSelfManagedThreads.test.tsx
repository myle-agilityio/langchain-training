import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api";
import type { ChatThread } from "@repo/types";
import {
  threadsQueryKey,
  useDeleteThread,
  useRenameThread,
  useSaveThread,
  useSelfManagedThreads,
} from "../useSelfManagedThreads";

const thread = (
  id: string,
  title: string | null = `Thread ${id}`,
): ChatThread => ({
  id,
  title,
  createdAt: "2026-03-04T09:00:00.000Z",
  updatedAt: "2026-03-05T09:00:00.000Z",
});

const page = (ids: string[], hasNext = false) => ({
  data: { threads: ids.map((id) => thread(id)), hasNext },
});

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const seedThreads = (ids: string[]) => {
  queryClient.setQueryData(threadsQueryKey, {
    pageParams: [0],
    pages: [{ threads: ids.map((id) => thread(id)), hasNext: false }],
  });
};

const cachedThreads = (): ChatThread[] =>
  (
    queryClient.getQueryData(threadsQueryKey) as
      { pages: { threads: ChatThread[] }[] } | undefined
  )?.pages.flatMap((p) => p.threads) ?? [];

const paramsOf = (spy: { mock: { calls: unknown[][] } }, i: number) =>
  (spy.mock.calls[i][1] as { params: Record<string, unknown> }).params;

beforeEach(() => {
  vi.restoreAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("useSelfManagedThreads", () => {
  it("flattens every loaded page into one list", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(page(["a", "b"]));

    const { result } = renderHook(() => useSelfManagedThreads(), { wrapper });

    await waitFor(() =>
      expect(result.current.threads.map((t) => t.id)).toEqual(["a", "b"]),
    );
  });

  it("caches an unsearched list under the exact key the mutations write to", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(page(["a"]));

    renderHook(() => useSelfManagedThreads(), { wrapper });

    await waitFor(() =>
      expect(queryClient.getQueryData(threadsQueryKey)).toBeDefined(),
    );
  });

  it("sends a trimmed search term and caches it separately", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue(page(["a"]));

    renderHook(() => useSelfManagedThreads("  grading  "), { wrapper });

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(paramsOf(get, 0).search).toBe("grading");
    expect(
      queryClient.getQueryData([...threadsQueryKey, "grading"]),
    ).toBeDefined();
    expect(queryClient.getQueryData(threadsQueryKey)).toBeUndefined();
  });

  it("treats a whitespace-only search as no search at all", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue(page(["a"]));

    renderHook(() => useSelfManagedThreads("   "), { wrapper });

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(paramsOf(get, 0).search).toBeUndefined();
    expect(queryClient.getQueryData(threadsQueryKey)).toBeDefined();
  });

  it("asks for the next page at an offset counted from what it holds", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce(page(["a", "b"], true))
      .mockResolvedValueOnce(page(["c"], false));

    const { result } = renderHook(() => useSelfManagedThreads(), { wrapper });

    await waitFor(() => expect(result.current.hasMore).toBe(true));
    result.current.loadMore();

    await waitFor(() =>
      expect(result.current.threads.map((t) => t.id)).toEqual(["a", "b", "c"]),
    );
    expect(paramsOf(get, 1).offset).toBe(2);
  });
});

describe("useRenameThread", () => {
  it("shows the new title before the server confirms", async () => {
    seedThreads(["a", "b"]);
    vi.spyOn(apiClient, "patch").mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRenameThread(), { wrapper });

    result.current("a", "Renamed");

    await waitFor(() =>
      expect(cachedThreads().find((t) => t.id === "a")?.title).toBe("Renamed"),
    );
    expect(cachedThreads().find((t) => t.id === "b")?.title).toBe("Thread b");
  });

  it("puts the old title back when the write fails", async () => {
    seedThreads(["a"]);
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useRenameThread(), { wrapper });

    result.current("a", "Renamed");

    await waitFor(() => expect(patch).toHaveBeenCalled());
    await waitFor(() => expect(cachedThreads()[0].title).toBe("Thread a"));
  });
});

describe("useDeleteThread", () => {
  it("drops the row from the list straight away", async () => {
    seedThreads(["a", "b"]);
    vi.spyOn(apiClient, "delete").mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDeleteThread(), { wrapper });

    result.current("a");

    await waitFor(() =>
      expect(cachedThreads().map((t) => t.id)).toEqual(["b"]),
    );
  });

  it("puts it back when the delete fails", async () => {
    seedThreads(["a", "b"]);
    const del = vi
      .spyOn(apiClient, "delete")
      .mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useDeleteThread(), { wrapper });

    result.current("a");

    await waitFor(() => expect(del).toHaveBeenCalled());
    await waitFor(() =>
      expect(cachedThreads().map((t) => t.id)).toEqual(["a", "b"]),
    );
  });
});

describe("useSaveThread", () => {
  it("refreshes the list once the upsert settles, failure included", async () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    vi.spyOn(apiClient, "post").mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useSaveThread(), { wrapper });

    result.current({ id: "t1" });

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: threadsQueryKey }),
    );
  });
});
