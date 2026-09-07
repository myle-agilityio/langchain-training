import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToolReasoning } from "..";

const details = (): HTMLDetailsElement | null =>
  document.querySelector("details");

describe("ToolReasoning", () => {
  it("names the tool even when it was called with no arguments", () => {
    render(<ToolReasoning name="count_emails" status="complete" />);

    expect(screen.getByText("count_emails")).toBeInTheDocument();
    expect(details()).toBeNull();
  });

  it("summarises each argument rather than dumping it", () => {
    render(
      <ToolReasoning
        name="get_emails"
        status="complete"
        args={{
          sender: "Flo",
          ids: ["a", "b", "c"],
          filter: { status: "unread", urgency: "high" },
          limit: 20,
          unclassified: true,
        }}
      />,
    );

    expect(screen.getByText('"Flo"')).toBeInTheDocument();
    expect(screen.getByText("[3 items]")).toBeInTheDocument();
    expect(screen.getByText("{2 keys}")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("opens the argument list while the tool is running", () => {
    render(
      <ToolReasoning name="get_emails" status="executing" args={{ a: 1 }} />,
    );

    expect(details()?.open).toBe(true);
  });

  it("collapses it once the tool is done", () => {
    render(
      <ToolReasoning name="get_emails" status="complete" args={{ a: 1 }} />,
    );

    expect(details()?.open).toBe(false);
  });

  it("treats inProgress as running too", () => {
    render(
      <ToolReasoning name="get_emails" status="inProgress" args={{ a: 1 }} />,
    );

    expect(details()?.open).toBe(true);
  });
});
