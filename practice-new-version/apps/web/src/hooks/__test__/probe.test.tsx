import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

describe("probe", () => {
  it("runs a queryFn at all", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const queryFn = vi
      .fn()
      .mockResolvedValue({ emails: [{ id: "a" }], hasNext: false });

    const { result } = renderHook(
      () =>
        useInfiniteQuery({
          queryKey: ["probe"],
          queryFn,
          initialPageParam: 0,
          getNextPageParam: () => undefined,
        }),
      { wrapper },
    );

    await waitFor(() => expect(queryFn).toHaveBeenCalled());
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.pages[0].emails).toEqual([{ id: "a" }]);
  });
});
