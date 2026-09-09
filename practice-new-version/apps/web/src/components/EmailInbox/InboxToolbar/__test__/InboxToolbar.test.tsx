import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InboxToolbar } from "..";

type Props = Parameters<typeof InboxToolbar>[0];

const handlers = () => ({
  onRefresh: vi.fn(),
  onOpenFilters: vi.fn(),
  onSearchChange: vi.fn(),
});

const draw = (overrides: Partial<Props> = {}) => {
  const spies = handlers();
  const props: Props = {
    isLoading: false,
    isRefreshing: false,
    isFiltered: false,
    search: "",
    ...spies,
    ...overrides,
  };

  render(<InboxToolbar {...props} />);

  return spies;
};

describe("InboxToolbar — filter and refresh", () => {
  it("opens the filter dialog and marks the button as active when filtering", async () => {
    const spies = draw({ isFiltered: true });

    await userEvent.click(screen.getByRole("button", { name: "Filter inbox" }));

    expect(spies.onOpenFilters).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Filter inbox" })).toHaveClass(
      "text-primary",
    );
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
});

describe("InboxToolbar — search", () => {
  it("reports each keystroke back to the caller", async () => {
    const spies = draw();

    await userEvent.type(
      screen.getByRole("textbox", { name: "Search emails" }),
      "grade",
    );

    expect(spies.onSearchChange).toHaveBeenCalledTimes(5);
    expect(spies.onSearchChange).toHaveBeenLastCalledWith("e");
  });
});
