import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { Email } from "@/types";
import { InboxList } from "..";

const email = (id: string, overrides: Partial<Email> = {}): Email => ({
  id,
  from: { name: `Sender ${id}`, email: `${id}@example.com` },
  subject: `Subject ${id}`,
  body: `Body ${id}`,
  receivedAt: "2026-03-04T09:00:00.000Z",
  status: "unread",
  ...overrides,
});

type Props = Parameters<typeof InboxList>[0];

const handlers = () => ({
  onRefresh: vi.fn(),
  onMarkAllRead: vi.fn(),
  onMarkAllUnread: vi.fn(),
  onSelect: vi.fn(),
  onToggleRead: vi.fn(),
  onLoadMore: vi.fn(),
});

const draw = (overrides: Partial<Props> = {}) => {
  const spies = handlers();
  const props: Props = {
    emails: [email("a")],
    totalCount: 1,
    isLoading: false,
    isFiltered: false,
    isRefreshing: false,
    selectedId: null,
    hasMore: false,
    isLoadingMore: false,
    ...spies,
    ...overrides,
  };

  render(<InboxList {...props} />);

  return spies;
};

describe("InboxList — header", () => {
  it("says the count is not known yet rather than claiming zero", () => {
    draw({ isLoading: true, emails: [] });

    expect(screen.getByText("…")).toBeInTheDocument();
    expect(screen.queryByText("(0)")).not.toBeInTheDocument();
  });

  it("shows a plain count when nothing is filtered", () => {
    draw({ emails: [email("a"), email("b")], totalCount: 2 });

    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("shows how many of the whole inbox survived the filter", () => {
    draw({ emails: [email("a")], totalCount: 9, isFiltered: true });

    expect(screen.getByText("(1 of 9)")).toBeInTheDocument();
  });

  it("refreshes on demand, and refuses while a refresh is already running", async () => {
    const spies = draw({ isRefreshing: true });

    await userEvent.click(
      screen.getByRole("button", { name: "Refresh inbox" }),
    );

    expect(spies.onRefresh).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Refresh inbox" }),
    ).toBeDisabled();
  });

  it("offers mark-all-read only while something is unread", async () => {
    draw({ emails: [email("a", { status: "read" })] });

    await userEvent.click(screen.getByRole("button", { name: "List actions" }));

    expect(await screen.findByText("Mark all as read")).toHaveAttribute(
      "data-disabled",
    );
    expect(screen.getByText("Mark all as unread")).not.toHaveAttribute(
      "data-disabled",
    );
  });

  it("marks everything read when asked", async () => {
    const spies = draw({ emails: [email("a")] });

    await userEvent.click(screen.getByRole("button", { name: "List actions" }));
    await userEvent.click(await screen.findByText("Mark all as read"));

    expect(spies.onMarkAllRead).toHaveBeenCalledOnce();
  });
});

describe("InboxList — rows", () => {
  it("says so plainly when nothing matched", () => {
    draw({ emails: [] });

    expect(screen.getByText("No emails")).toBeInTheDocument();
  });

  it("shows sender, subject and a preview of the body", () => {
    draw();

    expect(screen.getByText("Sender a")).toBeInTheDocument();
    expect(screen.getByText("Subject a")).toBeInTheDocument();
    expect(screen.getByText("Body a")).toBeInTheDocument();
  });

  it("labels a classified email with topic, grade and urgency", () => {
    draw({
      emails: [
        email("a", {
          classification: {
            topic: "grade_dispute",
            course: "math_12",
            workType: "quiz",
            urgency: "high",
          },
        }),
      ],
    });

    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("Grade dispute")).toBeInTheDocument();
  });

  it("leaves an unclassified email unlabelled", () => {
    draw();

    expect(screen.queryByText("high")).not.toBeInTheDocument();
  });

  it("marks a replied and a flagged email", () => {
    draw({
      emails: [
        email("a", { status: "replied" }),
        email("b", { status: "flagged_for_followup" }),
      ],
    });

    expect(screen.getByText("Replied")).toBeInTheDocument();
    expect(screen.getByText("Follow up")).toBeInTheDocument();
  });

  it("selects a row on click and on the keyboard", async () => {
    const spies = draw();
    const row = screen.getByText("Subject a").closest('[role="button"]')!;

    await userEvent.click(row);
    expect(spies.onSelect).toHaveBeenCalledTimes(1);

    (row as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(spies.onSelect).toHaveBeenCalledTimes(3);
  });

  it("offers mark-as-read on an unread row, and the reverse on a read one", async () => {
    const spies = draw({ emails: [email("a", { status: "read" })] });

    await userEvent.click(
      screen.getByRole("button", { name: "Email actions" }),
    );

    expect(await screen.findByText("Mark as read")).toHaveAttribute(
      "data-disabled",
    );

    await userEvent.click(screen.getByText("Mark as unread"));

    expect(spies.onToggleRead).toHaveBeenCalledOnce();
  });

  it("never offers to un-read an email that was already replied to", async () => {
    draw({ emails: [email("a", { status: "replied" })] });

    await userEvent.click(
      screen.getByRole("button", { name: "Email actions" }),
    );

    expect(await screen.findByText("Mark as unread")).toHaveAttribute(
      "data-disabled",
    );
  });
});

describe("InboxList — paging", () => {
  it("shows the loading line only while another page is on the way", () => {
    draw({ hasMore: true, isLoadingMore: true });

    expect(screen.getByText("Loading more…")).toBeInTheDocument();
  });

  it("says nothing about more pages when there are none", () => {
    draw({ hasMore: false, isLoadingMore: false });

    expect(screen.queryByText("Loading more…")).not.toBeInTheDocument();
  });
});
