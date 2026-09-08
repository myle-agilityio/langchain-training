import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { useAgent } from "@copilotkit/react-core/v2";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TOOL } from "@repo/constants";
import { inboxQueryKey } from "../useSharedInbox";
import { useSyncInbox } from "../useSyncInbox";

vi.mock("@copilotkit/react-core/v2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@copilotkit/react-core/v2")>()),
  useAgent: vi.fn(),
}));

type Handlers = {
  onNewToolCall?: (event: { toolCall: { function: { name: string } } }) => void;
  onRunFinalized?: () => void;
};

let handlers: Handlers;
let unsubscribe: ReturnType<typeof vi.fn>;
let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const toolCall = (name: string) => ({ toolCall: { function: { name } } });

beforeEach(() => {
  handlers = {};
  unsubscribe = vi.fn();
  queryClient = new QueryClient();
  vi.mocked(useAgent).mockReturnValue({
    agent: {
      subscribe: (next: Handlers) => {
        handlers = next;

        return { unsubscribe };
      },
    },
  } as unknown as ReturnType<typeof useAgent>);
});

describe("useSyncInbox", () => {
  it("refetches the inbox after a run that wrote to it", () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useSyncInbox(), { wrapper });

    handlers.onNewToolCall?.(toolCall(TOOL.UPDATE_EMAIL_STATUS));
    handlers.onRunFinalized?.();

    expect(invalidate).toHaveBeenCalledWith({ queryKey: inboxQueryKey });
  });

  it("spends nothing on a run that only read", () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useSyncInbox(), { wrapper });

    handlers.onNewToolCall?.(toolCall(TOOL.GET_EMAILS));
    handlers.onNewToolCall?.(toolCall(TOOL.SEARCH_KNOWLEDGE_BASE));
    handlers.onRunFinalized?.();

    expect(invalidate).not.toHaveBeenCalled();
  });

  it("counts a reply and a classify as writes too", () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useSyncInbox(), { wrapper });

    handlers.onNewToolCall?.(toolCall(TOOL.REPLY_TO_EMAIL));
    handlers.onRunFinalized?.();
    handlers.onNewToolCall?.(toolCall(TOOL.CLASSIFY_EMAILS));
    handlers.onRunFinalized?.();

    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it("forgets the flag after refetching, so the next quiet run does nothing", () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    renderHook(() => useSyncInbox(), { wrapper });

    handlers.onNewToolCall?.(toolCall(TOOL.UPDATE_EMAIL_STATUS));
    handlers.onRunFinalized?.();
    handlers.onRunFinalized?.();

    expect(invalidate).toHaveBeenCalledOnce();
  });

  it("stops listening when the component goes away", () => {
    const { unmount } = renderHook(() => useSyncInbox(), { wrapper });

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
