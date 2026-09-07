import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PulsingDot } from "..";

describe("PulsingDot", () => {
  it("carries the animation class the stylesheet hooks onto", () => {
    const { container } = render(<PulsingDot />);

    expect(container.firstElementChild).toHaveClass("pulsing-dot", "size-1.5");
  });

  it("lets a caller override the colour", () => {
    const { container } = render(<PulsingDot className="bg-primary" />);

    expect(container.firstElementChild).toHaveClass("bg-primary");
    expect(container.firstElementChild).not.toHaveClass("bg-muted-foreground");
  });
});
