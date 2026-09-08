import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api";
import type { ChatThread } from "@repo/types";
import { ThreadsMenu } from "..";

vi.mock("@copilotkit/react-core/v2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@copilotkit/react-core/v2")>()),
  useCopilotChatConfiguration: vi.fn(),
}));

const thread = (id: string, title: string | null): ChatThread => ({
  id,
  title,
  createdAt: "2026-03-04T09:00:00.000Z",
  updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
});

const config = () => ({
  threadId: "a",
  hasExplicitThreadId: true,
  startNewThread: vi.fn(),
  setActiveThreadId: vi.fn(),
});

let queryClient: QueryClient;

const wrap = (children: ReactNode) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const openMenu = async (threads: ChatThread[]) => {
  vi.spyOn(apiClient, "get").mockResolvedValue({
    data: { threads, hasNext: false },
  } as never);

  render(wrap(<ThreadsMenu />));
  await userEvent.click(
    screen.getByRole("button", { name: "Conversation history" }),
  );
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(useCopilotChatConfiguration).mockReturnValue(
    config() as unknown as ReturnType<typeof useCopilotChatConfiguration>,
  );
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("ThreadsMenu", () => {
  it("renders nothing at all outside a chat configuration", () => {
    vi.mocked(useCopilotChatConfiguration).mockReturnValue(
      undefined as unknown as ReturnType<typeof useCopilotChatConfiguration>,
    );

    const { container } = render(wrap(<ThreadsMenu />));

    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the list closed until the clock button is used", () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { threads: [], hasNext: false },
    } as never);

    render(wrap(<ThreadsMenu />));

    expect(screen.queryByText("New chat")).not.toBeInTheDocument();
  });

  it("lists each conversation with how long ago it was touched", async () => {
    await openMenu([thread("a", "Grading questions")]);

    expect(await screen.findByText("Grading questions")).toBeInTheDocument();
    expect(screen.getByText("5m ago")).toBeInTheDocument();
  });

  it("names an untitled conversation", async () => {
    await openMenu([thread("a", null)]);

    expect(await screen.findByText("New conversation")).toBeInTheDocument();
  });

  it("says the list is empty, and says it differently while searching", async () => {
    await openMenu([]);

    expect(
      await screen.findByText("No conversations yet."),
    ).toBeInTheDocument();

    await userEvent.type(
      screen.getByPlaceholderText("Search conversations…"),
      "grading",
    );

    expect(
      await screen.findByText("No matching conversations."),
    ).toBeInTheDocument();
  });

  it("switches to a conversation when its row is clicked", async () => {
    const chat = config();

    vi.mocked(useCopilotChatConfiguration).mockReturnValue(
      chat as unknown as ReturnType<typeof useCopilotChatConfiguration>,
    );

    await openMenu([thread("b", "Late work")]);
    await userEvent.click(await screen.findByText("Late work"));

    expect(chat.setActiveThreadId).toHaveBeenCalledWith("b", {
      explicit: true,
    });
  });

  it("starts a new chat from the header action", async () => {
    const chat = config();

    vi.mocked(useCopilotChatConfiguration).mockReturnValue(
      chat as unknown as ReturnType<typeof useCopilotChatConfiguration>,
    );

    await openMenu([]);
    await userEvent.click(await screen.findByText("New chat"));

    expect(chat.startNewThread).toHaveBeenCalledOnce();
  });
});

describe("ThreadsMenu — renaming", () => {
  it("commits a new title on Enter", async () => {
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: {} } as never);

    await openMenu([thread("b", "Late work")]);
    await userEvent.click(await screen.findByTitle("Rename"));

    const rename = screen.getByDisplayValue("Late work");

    await userEvent.clear(rename);
    await userEvent.type(rename, "Renamed{Enter}");

    expect(patch).toHaveBeenCalledWith(
      "/api/threads",
      { id: "b", title: "Renamed" },
      expect.anything(),
    );
  });

  it("abandons the rename on Escape", async () => {
    const patch = vi.spyOn(apiClient, "patch");

    await openMenu([thread("b", "Late work")]);
    await userEvent.click(await screen.findByTitle("Rename"));
    await userEvent.type(
      screen.getByDisplayValue("Late work"),
      "Renamed{Escape}",
    );

    expect(patch).not.toHaveBeenCalled();
  });

  it("refuses to save an empty title", async () => {
    const patch = vi.spyOn(apiClient, "patch");

    await openMenu([thread("b", "Late work")]);
    await userEvent.click(await screen.findByTitle("Rename"));

    const blank = screen.getByDisplayValue("Late work");

    await userEvent.clear(blank);
    await userEvent.type(blank, "   {Enter}");

    expect(patch).not.toHaveBeenCalled();
  });
});

describe("ThreadsMenu — deleting", () => {
  it("deletes the conversation the button belongs to", async () => {
    const del = vi
      .spyOn(apiClient, "delete")
      .mockResolvedValue({ data: {} } as never);

    await openMenu([thread("b", "Late work")]);
    await userEvent.click(await screen.findByTitle("Delete"));

    expect(del).toHaveBeenCalledWith(
      "/api/threads",
      expect.objectContaining({ params: { id: "b" } }),
    );
  });

  it("starts a fresh chat when the open conversation is the one deleted", async () => {
    const chat = config();

    vi.mocked(useCopilotChatConfiguration).mockReturnValue(
      chat as unknown as ReturnType<typeof useCopilotChatConfiguration>,
    );
    vi.spyOn(apiClient, "delete").mockResolvedValue({ data: {} } as never);

    await openMenu([thread("a", "Grading questions")]);
    await userEvent.click(await screen.findByTitle("Delete"));

    expect(chat.startNewThread).toHaveBeenCalledOnce();
  });
});
