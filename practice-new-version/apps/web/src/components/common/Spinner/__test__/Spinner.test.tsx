import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "..";

const spinner = (container: HTMLElement) =>
  container.firstElementChild as HTMLElement;

describe("Spinner", () => {
  it("defaults to the medium size", () => {
    const { container } = render(<Spinner />);

    expect(spinner(container)).toHaveClass("size-6", "animate-spin");
  });

  it("takes the size the caller asked for", () => {
    expect(spinner(render(<Spinner size="sm" />).container)).toHaveClass(
      "size-4",
    );
    expect(spinner(render(<Spinner size="lg" />).container)).toHaveClass(
      "size-8",
    );
  });

  it("merges a caller's class", () => {
    const { container } = render(<Spinner className="text-primary" />);

    expect(spinner(container)).toHaveClass("text-primary", "size-6");
  });
});
