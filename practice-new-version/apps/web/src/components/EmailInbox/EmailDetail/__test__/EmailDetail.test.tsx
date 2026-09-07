import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOpenAIKey } from "@/stores";
import type { Email } from "@/types";
import { EmailDetail } from "..";

const email = (overrides: Partial<Email> = {}): Email => ({
  id: "a",
  from: { name: "Flo Beahan", email: "flo.beahan93@hotmail.com" },
  subject: "Missed test Monday",
  body: "Jewell was absent on Monday.",
  receivedAt: "2026-03-04T09:00:00.000Z",
  status: "unread",
  ...overrides,
});

type Props = Parameters<typeof EmailDetail>[0];

let queryClient: QueryClient;

const wrap = (children: ReactNode) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const draw = (overrides: Partial<Props> = {}) => {
  const onSendReply = vi.fn();
  const onAskAgent = vi.fn();
  const props: Props = {
    email: email(),
    isLoading: false,
    isAgentBusy: false,
    isDrafting: false,
    onSendReply,
    onAskAgent,
    ...overrides,
  };
  const view = render(wrap(<EmailDetail {...props} />));

  return { onSendReply, onAskAgent, view, props };
};

beforeEach(() => {
  vi.restoreAllMocks();
  // No key: RelatedArticles stays on its empty branch instead of firing a request.
  useOpenAIKey.setState({ apiKey: null });
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

describe("EmailDetail — nothing open", () => {
  it("invites the teacher to pick one", () => {
    draw({ email: null });

    expect(screen.getByText("Select an email to read it")).toBeInTheDocument();
  });

  it("says the inbox is still loading rather than that nothing is selected", () => {
    draw({ email: null, isLoading: true });

    expect(screen.getByText("Loading inbox…")).toBeInTheDocument();
  });
});

describe("EmailDetail — reading", () => {
  it("shows subject, sender, address and body", () => {
    draw();

    expect(screen.getByText("Missed test Monday")).toBeInTheDocument();
    expect(screen.getByText("Flo Beahan")).toBeInTheDocument();
    expect(screen.getByText("<flo.beahan93@hotmail.com>")).toBeInTheDocument();
    expect(
      screen.getByText("Jewell was absent on Monday."),
    ).toBeInTheDocument();
  });

  it("labels a classified email, skipping the fields set to none", () => {
    draw({
      email: email({
        classification: {
          topic: "absence",
          course: "none",
          workType: "none",
          urgency: "high",
        },
      }),
    });

    expect(screen.getByText("high urgency")).toBeInTheDocument();
    expect(screen.queryByText("Grade 11")).not.toBeInTheDocument();
  });
});

describe("EmailDetail — replying", () => {
  it("offers both a manual and an agent-drafted reply", () => {
    draw();

    expect(
      screen.getByRole("button", { name: "Compose reply" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ask AI to draft/ }),
    ).toBeInTheDocument();
  });

  it("hands the whole email to the agent when asked to draft", async () => {
    const { onAskAgent } = draw();

    await userEvent.click(
      screen.getByRole("button", { name: /Ask AI to draft/ }),
    );

    expect(onAskAgent).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a" }),
    );
  });

  it("says it is drafting rather than just going dead", () => {
    draw({ isAgentBusy: true, isDrafting: true });

    expect(screen.getByRole("button", { name: /Drafting/ })).toBeDisabled();
  });

  it("blocks a second draft while the agent is busy elsewhere", () => {
    draw({ isAgentBusy: true, isDrafting: false });

    expect(
      screen.getByRole("button", { name: /Ask AI to draft/ }),
    ).toBeDisabled();
  });

  it("sends a manual reply and closes the form", async () => {
    const { onSendReply } = draw();

    await userEvent.click(
      screen.getByRole("button", { name: "Compose reply" }),
    );
    await userEvent.type(
      screen.getByPlaceholderText("Write your reply…"),
      "Wednesday works.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(onSendReply).toHaveBeenCalledWith(
      "a",
      "Re: Missed test Monday",
      "Wednesday works.",
    );
    expect(
      screen.getByRole("button", { name: "Compose reply" }),
    ).toBeInTheDocument();
  });

  it("abandons a half-written draft when another email is opened", async () => {
    const { view, props } = draw();

    await userEvent.click(
      screen.getByRole("button", { name: "Compose reply" }),
    );

    expect(
      screen.getByPlaceholderText("Write your reply…"),
    ).toBeInTheDocument();

    view.rerender(
      wrap(
        <EmailDetail
          {...props}
          email={email({ id: "b", subject: "Late project" })}
        />,
      ),
    );

    expect(
      screen.queryByPlaceholderText("Write your reply…"),
    ).not.toBeInTheDocument();
  });
});

describe("EmailDetail — already answered", () => {
  it("shows the sent reply instead of offering to write another", () => {
    draw({
      email: email({
        status: "replied",
        reply: {
          subject: "Re: Missed test Monday",
          body: "Wednesday after school works.",
          sentAt: "2026-03-05T10:00:00.000Z",
        },
      }),
    });

    expect(
      screen.getByText("Wednesday after school works."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Compose reply" }),
    ).not.toBeInTheDocument();
  });
});
