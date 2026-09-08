import { renderHook } from "@testing-library/react";
import {
  useAgent,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useComposeApproval } from "@/stores";
import { useSyncComposeApproval } from "../useSyncComposeApproval";

vi.mock("@copilotkit/react-core/v2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@copilotkit/react-core/v2")>()),
  useAgent: vi.fn(),
  useCopilotChatConfiguration: vi.fn(),
}));

type Handlers = {
  onCustomEvent?: (e: { event: { name: string } }) => void;
  onRunStartedEvent?: () => void;
  onRunFailed?: () => void;
};

let handlers: Handlers;

const awaiting = () => useComposeApproval.getState().awaitingApproval;

const setThread = (threadId: string) =>
  vi.mocked(useCopilotChatConfiguration).mockReturnValue({
    threadId,
  } as unknown as ReturnType<typeof useCopilotChatConfiguration>);

beforeEach(() => {
  handlers = {};
  useComposeApproval.setState({ awaitingApproval: false });
  setThread("t1");
  vi.mocked(useAgent).mockReturnValue({
    agent: {
      subscribe: (next: Handlers) => {
        handlers = next;

        return { unsubscribe: vi.fn() };
      },
    },
  } as unknown as ReturnType<typeof useAgent>);
});

describe("useSyncComposeApproval", () => {
  it("raises the flag on the graph's interrupt event", () => {
    renderHook(() => useSyncComposeApproval());

    handlers.onCustomEvent?.({ event: { name: "on_interrupt" } });

    expect(awaiting()).toBe(true);
  });

  it("ignores other custom events the bridge emits", () => {
    renderHook(() => useSyncComposeApproval());

    handlers.onCustomEvent?.({ event: { name: "on_something_else" } });

    expect(awaiting()).toBe(false);
  });

  it("drops the flag when a new run starts", () => {
    renderHook(() => useSyncComposeApproval());

    handlers.onCustomEvent?.({ event: { name: "on_interrupt" } });
    handlers.onRunStartedEvent?.();

    expect(awaiting()).toBe(false);
  });

  it("drops the flag when the run fails, so the button is not left dead", () => {
    renderHook(() => useSyncComposeApproval());

    handlers.onCustomEvent?.({ event: { name: "on_interrupt" } });
    handlers.onRunFailed?.();

    expect(awaiting()).toBe(false);
  });

  it("does not let an unanswered card follow the teacher into another thread", () => {
    const { rerender } = renderHook(() => useSyncComposeApproval());

    handlers.onCustomEvent?.({ event: { name: "on_interrupt" } });
    expect(awaiting()).toBe(true);

    setThread("t2");
    rerender();

    expect(awaiting()).toBe(false);
  });
});
