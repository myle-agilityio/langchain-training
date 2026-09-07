import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "..";

const menu = (onSelect = vi.fn()) => {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>History</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onSelect}>New chat</DropdownMenuItem>
        <DropdownMenuItem disabled>Archived</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );

  return onSelect;
};

describe("DropdownMenu", () => {
  it("keeps its content unmounted until the trigger is used", () => {
    menu();

    expect(screen.queryByText("New chat")).not.toBeInTheDocument();
  });

  it("opens on the trigger and shows the items", async () => {
    menu();

    await userEvent.click(screen.getByText("History"));

    expect(await screen.findByText("New chat")).toBeInTheDocument();
  });

  it("reports the item chosen", async () => {
    const onSelect = menu();

    await userEvent.click(screen.getByText("History"));
    await userEvent.click(await screen.findByText("New chat"));

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("marks a disabled item as such", async () => {
    menu();

    await userEvent.click(screen.getByText("History"));

    expect(await screen.findByText("Archived")).toHaveAttribute(
      "data-disabled",
    );
  });
});
