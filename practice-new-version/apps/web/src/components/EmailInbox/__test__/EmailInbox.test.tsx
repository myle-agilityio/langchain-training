import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient, type EmailsPage } from "@/api";
import { inboxQueryKey } from "@/hooks";
import { useOpenAIKey } from "@/stores";
import type { Email } from "@/types";
import { EmailInbox } from "..";

const agent = { isRunning: false, addMessage: vi.fn(), state: undefined };

vi.mock("@copilotkit/react-core/v2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@copilotkit/react-core/v2")>()),
  useAgent: () => ({ agent }),
  useAgentContext: vi.fn(),
  useCopilotKit: () => ({ copilotkit: { runAgent: vi.fn() } }),
  useFrontendTool: vi.fn(),
}));

const email = (id: string, overrides: Partial<Email> = {}): Email => ({
  id,
  from: { name: `Sender ${id}`, email: `${id}@example.com` },
  subject: `Subject ${id}`,
  body: `Body ${id}`,
  receivedAt: "2026-03-04T09:00:00.000Z",
  status: "unread",
  ...overrides,
});

let queryClient: QueryClient;

const seed = (emails: Email[]) => {
  queryClient.setQueryData(inboxQueryKey, {
    pageParams: [0],
    pages: [{ emails, hasNext: false } satisfies EmailsPage],
  });
};

const draw = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <EmailInbox chatCollapsed={false} onOpenChat={vi.fn()} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

// The tools are registered through useFrontendTool; pull the definitions back out to drive them.
const runTool = (name: string, args: Record<string, unknown>) => {
  const definition = vi
    .mocked(useFrontendTool)
    .mock.calls.map((call) => call[0])
    .findLast((candidate) => candidate.name === name);

  const handler = definition?.handler as (
    toolArgs: Record<string, unknown>,
  ) => Promise<string>;

  return handler(args);
};

const patchedBody = (spy: { mock: { calls: unknown[][] } }, i = 0) =>
  spy.mock.calls[i][1] as {
    id?: string;
    ids?: string[];
    patch: Partial<Email>;
  };

beforeEach(() => {
  vi.clearAllMocks();
  useOpenAIKey.setState({ apiKey: "sk-teacher" });
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
});

describe("EmailInbox — opening an email", () => {
  it("marks an unread email read as soon as it is opened", async () => {
    seed([email("a")]);

    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: { email: email("a") } } as never);

    draw();
    await userEvent.click(screen.getByText("Subject a"));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patchedBody(patch)).toMatchObject({
      id: "a",
      patch: { status: "read" },
    });
  });

  it("spends no request opening one that was already read", async () => {
    seed([email("a", { status: "read" })]);

    const patch = vi.spyOn(apiClient, "patch");

    draw();
    await userEvent.click(screen.getByText("Subject a"));

    expect(patch).not.toHaveBeenCalled();
  });
});

describe("EmailInbox — bulk actions", () => {
  it("marks only the unread ones read, leaving replied and flagged alone", async () => {
    seed([
      email("a"),
      email("b", { status: "read" }),
      email("c", { status: "replied" }),
      email("d", { status: "flagged_for_followup" }),
    ]);

    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: { emails: [] } } as never);

    draw();
    await userEvent.click(screen.getByRole("button", { name: "List actions" }));
    await userEvent.click(await screen.findByText("Mark all as read"));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    // Only unread ones move; replied and flagged keep their badges.
    expect(patchedBody(patch).ids).toEqual(["a"]);
  });

  it("marks only the read ones unread", async () => {
    seed([email("a"), email("b", { status: "read" })]);

    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: { emails: [] } } as never);

    draw();
    await userEvent.click(screen.getByRole("button", { name: "List actions" }));
    await userEvent.click(await screen.findByText("Mark all as unread"));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patchedBody(patch).ids).toEqual(["b"]);
  });
});

describe("EmailInbox — the filterInbox tool", () => {
  it("narrows what is on screen and reports how much survived", async () => {
    seed([email("a"), email("b", { status: "read" })]);
    draw();

    const result = await runTool("filterInbox", { status: "unread" });

    expect(result).toBe("Filters applied — 1 of 2 emails visible.");
    await waitFor(() =>
      expect(screen.queryByText("Subject b")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("(1 of 2)")).toBeInTheDocument();
  });

  it("clears the filters when called with nothing", async () => {
    seed([email("a"), email("b", { status: "read" })]);
    draw();

    await runTool("filterInbox", { status: "unread" });

    const result = await runTool("filterInbox", {});

    expect(result).toBe("Filters cleared — all emails visible.");
    await waitFor(() =>
      expect(screen.getByText("Subject b")).toBeInTheDocument(),
    );
  });

  it("ignores fields the model sent empty", async () => {
    seed([email("a")]);
    draw();

    const result = await runTool("filterInbox", { from: "" });

    expect(result).toBe("Filters cleared — all emails visible.");
  });

  it("bulk actions act on what is filtered into view, not the whole inbox", async () => {
    seed([email("a"), email("b")]);

    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: { emails: [] } } as never);

    draw();
    await runTool("filterInbox", { from: "Sender a" });

    await waitFor(() =>
      expect(screen.queryByText("Subject b")).not.toBeInTheDocument(),
    );

    await userEvent.click(screen.getByRole("button", { name: "List actions" }));
    await userEvent.click(await screen.findByText("Mark all as read"));

    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patchedBody(patch).ids).toEqual(["a"]);
  });
});

describe("EmailInbox — the showEmail tool", () => {
  it("opens the email and says which one", async () => {
    seed([email("a")]);
    vi.spyOn(apiClient, "patch").mockResolvedValue({
      data: { email: email("a") },
    } as never);

    draw();

    const result = await runTool("showEmail", { id: "a" });

    expect(result).toBe(
      'Opened "Subject a" from Sender a in the reading pane.',
    );
  });

  it("tells the model how to recover from a stale id", async () => {
    seed([email("a")]);
    draw();

    const result = await runTool("showEmail", { id: "gone" });

    expect(result).toMatch(/No email with id gone/);
    expect(result).toMatch(/call get_emails/);
  });
});
