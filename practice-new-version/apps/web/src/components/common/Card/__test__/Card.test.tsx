import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "..";

describe("Card", () => {
  it("renders the whole composition in order", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Enter your key</CardTitle>
          <CardDescription>Stored in this browser only</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );

    expect(screen.getByText("Enter your key")).toBeInTheDocument();
    expect(screen.getByText("Stored in this browser only")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("keeps its surface classes while taking a caller's own", () => {
    render(<Card className="max-w-md">Body</Card>);

    expect(screen.getByText("Body")).toHaveClass("max-w-md", "bg-card");
  });

  it("forwards a ref to the outer element", () => {
    const ref = createRef<HTMLDivElement>();

    render(<Card ref={ref}>Body</Card>);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
