import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EMPTY_FILTERS, type EmailFilters } from "@/utils";
import { FilterDialog } from "..";

const setup = (filters: EmailFilters = EMPTY_FILTERS) => {
  const onApply = vi.fn();
  const onOpenChange = vi.fn();
  const view = render(
    <FilterDialog
      open
      onOpenChange={onOpenChange}
      filters={filters}
      onApply={onApply}
    />,
  );

  return { onApply, onOpenChange, view };
};

const click = (name: string) =>
  userEvent.click(screen.getByRole("button", { name }));

describe("FilterDialog", () => {
  it("opens showing the filters that are already active", () => {
    setup({ from: "flo", subject: "quiz" });

    expect(screen.getByPlaceholderText("Name or email")).toHaveValue("flo");
    expect(screen.getByPlaceholderText("Subject text")).toHaveValue("quiz");
  });

  it("applies the edited draft and closes", async () => {
    const { onApply, onOpenChange } = setup();

    await userEvent.type(screen.getByPlaceholderText("Name or email"), "flo");
    await click("Apply");

    expect(onApply).toHaveBeenCalledWith({ from: "flo" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("drops a field back to undefined when it is emptied again", async () => {
    const { onApply } = setup({ from: "flo" });

    await userEvent.clear(screen.getByPlaceholderText("Name or email"));
    await click("Apply");

    expect(onApply).toHaveBeenCalledWith({ from: undefined });
  });

  it("leaves the active filters untouched on cancel", async () => {
    const { onApply, onOpenChange } = setup();

    await userEvent.type(screen.getByPlaceholderText("Name or email"), "flo");
    await click("Cancel");

    expect(onApply).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clears everything and applies that immediately", async () => {
    const { onApply, onOpenChange } = setup({ from: "flo", subject: "quiz" });

    await click("Clear filters");

    expect(onApply).toHaveBeenCalledWith(EMPTY_FILTERS);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("throws away an abandoned draft when reopened", async () => {
    const onApply = vi.fn();
    const props = {
      onOpenChange: vi.fn(),
      filters: { from: "flo" },
      onApply,
    };
    const { rerender } = render(<FilterDialog open {...props} />);

    await userEvent.type(
      screen.getByPlaceholderText("Name or email"),
      "-edited",
    );

    rerender(<FilterDialog open={false} {...props} />);
    rerender(<FilterDialog open {...props} />);

    expect(screen.getByPlaceholderText("Name or email")).toHaveValue("flo");
  });
});
