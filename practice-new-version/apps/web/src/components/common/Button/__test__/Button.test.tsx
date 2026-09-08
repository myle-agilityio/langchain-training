import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "..";

describe("Button", () => {
  it("renders its label and calls back on click", async () => {
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Apply</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("swallows clicks while disabled", async () => {
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Apply
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to the primary variant at the default size", () => {
    render(<Button>Apply</Button>);

    expect(screen.getByRole("button")).toHaveClass("bg-primary", "h-9");
  });

  it("takes the variant and size the caller asked for", () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>,
    );

    expect(screen.getByRole("button")).toHaveClass("bg-destructive", "h-8");
  });

  it("merges a caller's class over the variant's own", () => {
    render(<Button className="w-full">Apply</Button>);

    expect(screen.getByRole("button")).toHaveClass("w-full", "bg-primary");
  });

  it("forwards a ref to the underlying button", () => {
    const ref = createRef<HTMLButtonElement>();

    render(<Button ref={ref}>Apply</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("passes through native attributes like type", () => {
    render(<Button type="submit">Save</Button>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
