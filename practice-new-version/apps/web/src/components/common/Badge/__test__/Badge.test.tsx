import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TONE } from "@/constants";
import { Badge } from "..";

describe("Badge", () => {
  it("renders its label", () => {
    render(<Badge>Homework</Badge>);

    expect(screen.getByText("Homework")).toBeInTheDocument();
  });

  it("defaults to the secondary variant", () => {
    render(<Badge>Homework</Badge>);

    expect(screen.getByText("Homework")).toHaveClass("bg-secondary");
  });

  it("takes the variant the caller asked for", () => {
    render(<Badge variant="outline">Homework</Badge>);

    expect(screen.getByText("Homework")).toHaveClass("border-border");
  });

  it("reads its colour from a sibling tone class for the tone variants", () => {
    render(
      <Badge variant="tone" className={TONE.violet}>
        Homework
      </Badge>,
    );

    expect(screen.getByText("Homework")).toHaveClass(TONE.violet);
  });

  it("passes native attributes through", () => {
    render(<Badge title="Topic">Homework</Badge>);

    expect(screen.getByText("Homework")).toHaveAttribute("title", "Topic");
  });
});
