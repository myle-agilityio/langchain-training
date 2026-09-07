import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "..";

const open = (onOpenChange = vi.fn()) => {
  render(
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter inbox</DialogTitle>
        </DialogHeader>
        <p>Body</p>
      </DialogContent>
    </Dialog>,
  );

  return onOpenChange;
};

describe("Dialog", () => {
  it("renders nothing while closed", () => {
    render(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>Filter inbox</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.queryByText("Filter inbox")).not.toBeInTheDocument();
  });

  it("shows title and body once open, as a dialog", () => {
    open();

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Filter inbox")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("offers a labelled close control that asks to close", async () => {
    const onOpenChange = open();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes on Escape", async () => {
    const onOpenChange = open();

    await userEvent.keyboard("{Escape}");

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
