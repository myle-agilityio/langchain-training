import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WelcomeScreen } from "..";

describe("WelcomeScreen", () => {
  it("greets the teacher and says what the assistant can do", () => {
    render(<WelcomeScreen input={null} suggestionView={null} />);

    expect(screen.getByText("Hi, how can I help?")).toBeInTheDocument();
    expect(
      screen.getByText(/triage the inbox, draft a reply/),
    ).toBeInTheDocument();
  });

  it("arranges the composer and suggestions it was handed", () => {
    render(
      <WelcomeScreen
        input={<div data-testid="composer" />}
        suggestionView={<div data-testid="suggestions" />}
      />,
    );

    expect(screen.getByTestId("composer")).toBeInTheDocument();
    expect(screen.getByTestId("suggestions")).toBeInTheDocument();
  });
});
