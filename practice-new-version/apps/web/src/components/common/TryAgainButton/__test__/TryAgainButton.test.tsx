import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TryAgainButton } from "..";

describe("TryAgainButton", () => {
  it("fires onClick when pressed", async () => {
    const onClick = vi.fn();

    render(<TryAgainButton onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("defaults to the small size", () => {
    render(<TryAgainButton onClick={vi.fn()} />);

    expect(screen.getByRole("button")).toHaveClass("text-sm");
  });

  it("takes the size the caller asked for", () => {
    render(<TryAgainButton onClick={vi.fn()} size="xs" />);

    expect(screen.getByRole("button")).toHaveClass("text-xs");
  });
});
