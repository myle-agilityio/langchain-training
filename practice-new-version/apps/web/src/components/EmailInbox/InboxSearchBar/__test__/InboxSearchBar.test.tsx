import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EMPTY_FILTERS, type EmailFilters } from "@/utils";
import { InboxSearchBar } from "..";

const setup = (filters: EmailFilters = EMPTY_FILTERS, search = "") => {
  const onApplyFilters = vi.fn();
  const onSearchChange = vi.fn();

  render(
    <InboxSearchBar
      search={search}
      onSearchChange={onSearchChange}
      filters={filters}
      onApplyFilters={onApplyFilters}
    />,
  );

  return { onApplyFilters, onSearchChange };
};

const openPanel = () =>
  userEvent.click(screen.getByRole("button", { name: "Filter inbox" }));

const click = (name: string) =>
  userEvent.click(screen.getByRole("button", { name }));

describe("InboxSearchBar — search", () => {
  it("reports each keystroke back to the caller", async () => {
    const { onSearchChange } = setup();

    await userEvent.type(
      screen.getByRole("textbox", { name: "Search emails" }),
      "grade",
    );

    expect(onSearchChange).toHaveBeenCalledTimes(5);
    expect(onSearchChange).toHaveBeenLastCalledWith("e");
  });
});

describe("InboxSearchBar — pills", () => {
  it("shows no pills and no clear button with nothing active", () => {
    setup();

    expect(screen.queryByText(/^Status:/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear search and filters" }),
    ).not.toBeInTheDocument();
  });

  it("shows the clear button once there's typed search text, even with no pills", () => {
    setup(EMPTY_FILTERS, "quiz");

    expect(
      screen.getByRole("button", { name: "Clear search and filters" }),
    ).toBeInTheDocument();
  });

  it("renders one pill per active structured field, labelled by name", () => {
    setup({ status: "unread", urgency: "high" });

    expect(screen.getByText("Status: Unread")).toBeInTheDocument();
    expect(screen.getByText("Urgency: High")).toBeInTheDocument();
  });

  it("leaves the quick search text out of the pills", () => {
    setup({ search: "grade dispute" });

    expect(screen.queryByText(/grade dispute/)).not.toBeInTheDocument();
  });

  it("clears both the structured filters and the typed search", async () => {
    const { onApplyFilters, onSearchChange } = setup(
      { status: "unread", search: "quiz" },
      "quiz",
    );

    await click("Clear search and filters");

    expect(onApplyFilters).toHaveBeenCalledWith({});
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("removes just that one field when a pill's own x is clicked", async () => {
    const { onApplyFilters } = setup({
      status: "unread",
      urgency: "high",
      search: "quiz",
    });

    await click("Remove Status: Unread filter");

    expect(onApplyFilters).toHaveBeenCalledWith({
      status: undefined,
      urgency: "high",
      search: "quiz",
    });
    expect(screen.getByText("Urgency: High")).toBeInTheDocument();
  });
});

describe("InboxSearchBar — filter panel", () => {
  it("marks the trigger active only once a structured filter is applied", () => {
    setup({ status: "unread" });

    expect(screen.getByRole("button", { name: "Filter inbox" })).toHaveClass(
      "text-primary",
    );
  });

  it("opens showing the filters that are already active", async () => {
    setup({ from: "flo", subject: "quiz" });
    await openPanel();

    expect(screen.getByPlaceholderText("Name or email")).toHaveValue("flo");
    expect(screen.getByPlaceholderText("Subject text")).toHaveValue("quiz");
  });

  it("applies the edited draft and closes", async () => {
    const { onApplyFilters } = setup();

    await openPanel();

    await userEvent.type(screen.getByPlaceholderText("Name or email"), "flo");
    await click("Apply");

    expect(onApplyFilters).toHaveBeenCalledWith({ from: "flo" });
    expect(
      screen.queryByPlaceholderText("Name or email"),
    ).not.toBeInTheDocument();
  });

  it("leaves the active filters untouched on cancel", async () => {
    const { onApplyFilters } = setup();

    await openPanel();

    await userEvent.type(screen.getByPlaceholderText("Name or email"), "flo");
    await click("Cancel");

    expect(onApplyFilters).not.toHaveBeenCalled();
    expect(
      screen.queryByPlaceholderText("Name or email"),
    ).not.toBeInTheDocument();
  });

  it("clears everything but the search, and applies that immediately", async () => {
    const { onApplyFilters } = setup({
      from: "flo",
      subject: "quiz",
      search: "keep me",
    });

    await openPanel();

    await click("Clear filters");

    expect(onApplyFilters).toHaveBeenCalledWith({ search: "keep me" });
    expect(
      screen.queryByPlaceholderText("Name or email"),
    ).not.toBeInTheDocument();
  });

  it("throws away an abandoned draft when closed and reopened", async () => {
    setup({ from: "flo" });
    await openPanel();

    await userEvent.type(
      screen.getByPlaceholderText("Name or email"),
      "-edited",
    );
    await click("Cancel");
    await openPanel();

    expect(screen.getByPlaceholderText("Name or email")).toHaveValue("flo");
  });
});
