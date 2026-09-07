import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useAgent,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api";
import { useSyncThreads } from "../useSyncThreads";

vi.mock("@copilotkit/react-core/v2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@copilotkit/react-core/v2")>()),
  useAgent: vi.fn(),
  useCopilotChatConfiguration: vi.fn(),
}));

type Handlers = { onRunFinalized?: () => void };

let handlers: Handlers;
let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const setAgent = (messages: { role?: string; content?: unknown }[]) =>
  vi.mocked(useAgent).mockReturnValue({
    agent: {
      messages,
      subscribe: (next: Handlers) => {
        handlers = next;

        return { unsubscribe: vi.fn() };
      },
    },
  } as unknown as ReturnType<typeof useAgent>);

const setThread = (threadId?: string) =>
  vi
    .mocked(useCopilotChatConfiguration)
    .mockReturnValue(
      (threadId ? { threadId } : undefined) as unknown as ReturnType<
        typeof useCopilotChatConfiguration
      >,
    );

const savedBody = (spy: { mock: { lastCall?: unknown[] } }) =>
  spy.mock.lastCall?.[1] as {
    id: string;
    firstMessage?: string;
    content?: string;
    messages?: unknown[];
  };

beforeEach(() => {
  vi.restoreAllMocks();
  handlers = {};
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  setThread("t1");
});

describe("useSyncThreads", () => {
  it("upserts the active thread once a run finishes", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: {} } as never);

    setAgent([
      { role: "user", content: "reply to Flo" },
      { role: "assistant", content: "Drafted." },
    ]);
    renderHook(() => useSyncThreads(), { wrapper });

    handlers.onRunFinalized?.();

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(savedBody(post).id).toBe("t1");
  });

  it("titles the thread from the first thing the teacher said", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: {} } as never);

    setAgent([
      { role: "assistant", content: "Hi!" },
      { role: "user", content: "reply to Flo" },
      { role: "user", content: "make it warmer" },
    ]);
    renderHook(() => useSyncThreads(), { wrapper });

    handlers.onRunFinalized?.();

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(savedBody(post).firstMessage).toBe("reply to Flo");
  });

  it("indexes every message so search finds a thread by anything said in it", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: {} } as never);

    setAgent([
      { role: "user", content: "reply to Flo" },
      { role: "assistant", content: [{ type: "text", text: "Drafted." }] },
    ]);
    renderHook(() => useSyncThreads(), { wrapper });

    handlers.onRunFinalized?.();

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(savedBody(post).content).toBe("reply to Flo\nDrafted.");
  });

  it("leaves content unset when nothing in the thread has text", async () => {
    const post = vi
      .spyOn(apiClient, "post")
      .mockResolvedValue({ data: {} } as never);

    setAgent([{ role: "user", content: [] }]);
    renderHook(() => useSyncThreads(), { wrapper });

    handlers.onRunFinalized?.();

    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(savedBody(post).content).toBeUndefined();
    expect(savedBody(post).firstMessage).toBeUndefined();
  });

  it("saves nothing when there is no active thread to save", () => {
    const post = vi.spyOn(apiClient, "post");

    setThread(undefined);
    setAgent([{ role: "user", content: "hi" }]);
    renderHook(() => useSyncThreads(), { wrapper });

    handlers.onRunFinalized?.();

    expect(post).not.toHaveBeenCalled();
  });
});
