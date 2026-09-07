import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { toast, useToast } from "@/stores";
import { Toaster } from "..";

beforeEach(() => {
  useToast.setState({ toasts: [] });
});

describe("Toaster", () => {
  it("renders nothing at all when there is nothing to say", () => {
    const { container } = render(<Toaster />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows one row per queued toast", () => {
    toast.error("Rate limited by OpenAI.");
    toast.info("Draft saved.");

    render(<Toaster />);

    expect(screen.getAllByRole("status")).toHaveLength(2);
    expect(screen.getByText("Rate limited by OpenAI.")).toBeInTheDocument();
    expect(screen.getByText("Draft saved.")).toBeInTheDocument();
  });

  it("lets clicks through the container to the page behind it", () => {
    toast.error("Rate limited by OpenAI.");

    const { container } = render(<Toaster />);

    expect(container.firstElementChild).toHaveClass("pointer-events-none");
    expect(screen.getByRole("status")).toHaveClass("pointer-events-auto");
  });
});
