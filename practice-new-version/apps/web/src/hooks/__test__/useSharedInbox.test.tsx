import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api";
import type { Email } from "@/types";
import {
  inboxQueryKey,
  usePatchEmail,
  usePatchEmails,
  useSharedInbox,
} from "../useSharedInbox";

// Spying on the axios instance, not vi.mock("@/api"): vitest.setup.ts loads the storybook
// preview, which instantiates @/api before a test file's module mocks can apply.
const email = (id: string, overrides: Partial<Email> = {}): Email => ({
  id,
  from: { name: `Sender ${id}`, email: `${id}@example.com` },
  subject: `Subject ${id}`,
  body: "body",
  receivedAt: "2026-03-04T09:00:00.000Z",
  status: "unread",
  ...overrides,
});

const page = (ids: string[], hasNext = false) => ({
  data: { emails: ids.map((id) => email(id)), hasNext },
});

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const seedInbox = (ids: string[]) => {
  queryClient.setQueryData(inboxQueryKey, {
    pageParams: [0],
    pages: [{ emails: ids.map((id) => email(id)), hasNext: false }],
  });
};

const cachedEmails = (): Email[] =>
  (
    queryClient.getQueryData(inboxQueryKey) as
      { pages: { emails: Email[] }[] } | undefined
  )?.pages.flatMap((p) => p.emails) ?? [];

const offsetsRequested = (spy: { mock: { calls: unknown[][] } }): number[] =>
  spy.mock.calls.map(
    (call) => (call[1] as { params: { offset: number } }).params.offset,
  );

beforeEach(() => {
  vi.restoreAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("useSharedInbox", () => {
  it("flattens every loaded page into one list", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue(page(["a", "b"]));

    const { result } = renderHook(() => useSharedInbox(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.emails.map((e) => e.id)).toEqual(["a", "b"]);
    expect(result.current.hasMore).toBe(false);
  });

  it("asks for the next page at an offset counted from what it already holds", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValueOnce(page(["a", "b"], true))
      .mockResolvedValueOnce(page(["c"], false));

    const { result } = renderHook(() => useSharedInbox(), { wrapper });

    await waitFor(() => expect(result.current.hasMore).toBe(true));
    result.current.loadMore();

    await waitFor(() =>
      expect(result.current.emails.map((e) => e.id)).toEqual(["a", "b", "c"]),
    );
    expect(offsetsRequested(get)).toEqual([0, 2]);
    expect(result.current.hasMore).toBe(false);
  });

  it("spins only for a manual refresh, then settles", async () => {
    const get = vi.spyOn(apiClient, "get").mockResolvedValue(page(["a"]));

    const { result } = renderHook(() => useSharedInbox(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isRefreshing).toBe(false);

    await result.current.refresh();

    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("hands back the same empty array while there is nothing loaded", () => {
    vi.spyOn(apiClient, "get").mockReturnValue(new Promise(() => {}));

    const { result, rerender } = renderHook(() => useSharedInbox(), {
      wrapper,
    });
    const first = result.current.emails;

    rerender();

    expect(result.current.emails).toBe(first);
    expect(result.current.isLoading).toBe(true);
  });
});

describe("usePatchEmail", () => {
  it("shows the change straight away, before the server answers", async () => {
    seedInbox(["a", "b"]);
    vi.spyOn(apiClient, "patch").mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePatchEmail(), { wrapper });

    result.current("a", { status: "read" });

    await waitFor(() =>
      expect(cachedEmails().find((e) => e.id === "a")?.status).toBe("read"),
    );
    expect(cachedEmails().find((e) => e.id === "b")?.status).toBe("unread");
  });

  it("writes the row the server echoed rather than spending a refetch", async () => {
    seedInbox(["a"]);
    vi.spyOn(apiClient, "patch").mockResolvedValue({
      data: {
        email: email("a", { status: "replied", subject: "From server" }),
      },
    });

    const { result } = renderHook(() => usePatchEmail(), { wrapper });

    result.current("a", { status: "read" });

    await waitFor(() =>
      expect(cachedEmails()[0]).toMatchObject({
        status: "replied",
        subject: "From server",
      }),
    );
  });

  it("puts the old row back when the write fails", async () => {
    seedInbox(["a"]);
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => usePatchEmail(), { wrapper });

    result.current("a", { status: "read" });

    await waitFor(() => expect(patch).toHaveBeenCalled());
    await waitFor(() => expect(cachedEmails()[0].status).toBe("unread"));
  });
});

describe("usePatchEmails", () => {
  it("patches every id given, in one request", async () => {
    seedInbox(["a", "b", "c"]);
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePatchEmails(), { wrapper });

    result.current(["a", "c"], { status: "read" });

    await waitFor(() =>
      expect(cachedEmails().map((e) => e.status)).toEqual([
        "read",
        "unread",
        "read",
      ]),
    );
    expect(patch).toHaveBeenCalledOnce();
  });

  it("does nothing at all when the selection is empty", () => {
    const patch = vi.spyOn(apiClient, "patch");

    const { result } = renderHook(() => usePatchEmails(), { wrapper });

    result.current([], { status: "read" });

    expect(patch).not.toHaveBeenCalled();
  });
});
