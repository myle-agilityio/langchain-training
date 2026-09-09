import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Popover, PopoverContent, PopoverTrigger } from "..";

const draw = () =>
  render(
    <Popover>
      <PopoverTrigger>Filter inbox</PopoverTrigger>
      <PopoverContent>Filter fields go here</PopoverContent>
    </Popover>,
  );

describe("Popover", () => {
  it("keeps its content unmounted until the trigger is used", () => {
    draw();

    expect(screen.queryByText("Filter fields go here")).not.toBeInTheDocument();
  });

  it("opens on the trigger and shows the content", async () => {
    draw();

    await userEvent.click(screen.getByText("Filter inbox"));

    expect(await screen.findByText("Filter fields go here")).toBeVisible();
  });

  it("closes again on a second click of the trigger", async () => {
    draw();

    await userEvent.click(screen.getByText("Filter inbox"));
    await screen.findByText("Filter fields go here");
    await userEvent.click(screen.getByText("Filter inbox"));

    expect(screen.queryByText("Filter fields go here")).not.toBeInTheDocument();
  });
});
