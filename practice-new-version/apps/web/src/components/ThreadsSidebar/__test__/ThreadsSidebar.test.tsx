import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api";
import type { ChatThread } from "@repo/types";
import { ThreadsSidebar } from "..";

vi.mock("@copilotkit/react-core/v2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@copilotkit/react-core/v2")>()),
  useCopilotChatConfiguration: vi.fn(),
}));

const thread = (id: string, title: string): ChatThread => ({
  id,
  title,
  createdAt: "2026-03-04T09:00:00.000Z",
  updatedAt: "2026-03-04T09:05:00.000Z",
});

let queryClient: QueryClient;

const draw = (threads: ChatThread[]) => {
  vi.spyOn(apiClient, "get").mockResolvedValue({
    data: { threads, hasNext: false },
  } as never);

  return render(
    <QueryClientProvider client={queryClient}>
      <ThreadsSidebar />
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(useCopilotChatConfiguration).mockReturnValue({
    threadId: "a",
    hasExplicitThreadId: true,
    startNewThread: vi.fn(),
    setActiveThreadId: vi.fn(),
  } as unknown as ReturnType<typeof useCopilotChatConfiguration>);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("ThreadsSidebar", () => {
  it("shows the conversations without anything being opened first", async () => {
    draw([thread("b", "Late work")]);

    expect(await screen.findByText("Late work")).toBeInTheDocument();
    expect(screen.getByText("New chat")).toBeInTheDocument();
  });

  it("renders nothing at all outside a chat configuration", () => {
    vi.mocked(useCopilotChatConfiguration).mockReturnValue(
      undefined as unknown as ReturnType<typeof useCopilotChatConfiguration>,
    );

    const { container } = draw([thread("b", "Late work")]);

    expect(container).toBeEmptyDOMElement();
  });
});
