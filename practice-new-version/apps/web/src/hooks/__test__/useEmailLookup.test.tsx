import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api";
import type { Email } from "@/types";
import { useEmailLookup } from "../useEmailLookup";

const email = (id: string): Email => ({
  id,
  from: { name: `Sender ${id}`, email: `${id}@example.com` },
  subject: `Subject ${id}`,
  body: "body",
  receivedAt: "2026-03-04T09:00:00.000Z",
  status: "unread",
});

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.restoreAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

describe("useEmailLookup", () => {
  it("resolves an id a tool result carries to the full email", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { emails: [email("a"), email("b")], hasNext: false },
    });

    const { result } = renderHook(() => useEmailLookup(), { wrapper });

    await waitFor(() => expect(result.current.size).toBe(2));
    expect(result.current.get("a")?.subject).toBe("Subject a");
    expect(result.current.get("missing")).toBeUndefined();
  });

  it("is an empty map while the inbox is still loading", () => {
    vi.spyOn(apiClient, "get").mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useEmailLookup(), { wrapper });

    expect(result.current.size).toBe(0);
  });
});
