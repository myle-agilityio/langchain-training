import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EMPTY_FILTERS, type EmailFilters } from "@/utils";
import { FilterPopover } from "..";

const setup = (filters: EmailFilters = EMPTY_FILTERS) => {
  const onApply = vi.fn();

  render(
    <FilterPopover filters={filters} onApply={onApply} isFiltered={false} />,
  );

  return { onApply };
};

const openPanel = () =>
  userEvent.click(screen.getByRole("button", { name: "Filter inbox" }));

const click = (name: string) =>
  userEvent.click(screen.getByRole("button", { name }));

describe("FilterPopover", () => {
  it("keeps the form unmounted until the filter button is clicked", () => {
    setup();

    expect(
      screen.queryByPlaceholderText("Name or email"),
    ).not.toBeInTheDocument();
  });

  it("opens showing the filters that are already active", async () => {
    setup({ from: "flo", subject: "quiz" });
    await openPanel();

    expect(screen.getByPlaceholderText("Name or email")).toHaveValue("flo");
    expect(screen.getByPlaceholderText("Subject text")).toHaveValue("quiz");
  });

  it("applies the edited draft and closes", async () => {
    const { onApply } = setup();

    await openPanel();

    await userEvent.type(screen.getByPlaceholderText("Name or email"), "flo");
    await click("Apply");

    expect(onApply).toHaveBeenCalledWith({ from: "flo" });
    expect(
      screen.queryByPlaceholderText("Name or email"),
    ).not.toBeInTheDocument();
  });

  it("drops a field back to undefined when it is emptied again", async () => {
    const { onApply } = setup({ from: "flo" });

    await openPanel();

    await userEvent.clear(screen.getByPlaceholderText("Name or email"));
    await click("Apply");

    expect(onApply).toHaveBeenCalledWith({ from: undefined });
  });

  it("leaves the active filters untouched on cancel", async () => {
    const { onApply } = setup();

    await openPanel();

    await userEvent.type(screen.getByPlaceholderText("Name or email"), "flo");
    await click("Cancel");

    expect(onApply).not.toHaveBeenCalled();
    expect(
      screen.queryByPlaceholderText("Name or email"),
    ).not.toBeInTheDocument();
  });

  it("clears everything and applies that immediately", async () => {
    const { onApply } = setup({ from: "flo", subject: "quiz" });

    await openPanel();

    await click("Clear filters");

    expect(onApply).toHaveBeenCalledWith(EMPTY_FILTERS);
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
