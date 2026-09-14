import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GenericToolCard } from "..";

describe("GenericToolCard", () => {
  it("names the tool even when it was called with no arguments", () => {
    render(<GenericToolCard name="count_emails" status="complete" />);

    expect(screen.getByText("count_emails")).toBeInTheDocument();
    expect(screen.getByText("Done.")).toBeInTheDocument();
  });

  it("summarises each argument rather than dumping it", () => {
    render(
      <GenericToolCard
        name="get_emails"
        status="complete"
        parameters={{
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

  it("shows a pending state while the tool is still running", () => {
    render(
      <GenericToolCard
        name="get_emails"
        status="executing"
        parameters={{ a: 1 }}
      />,
    );

    expect(screen.getByText("Running…")).toBeInTheDocument();
  });

  it("shows the failure once the envelope reports one", () => {
    render(
      <GenericToolCard
        name="get_emails"
        status="complete"
        result={JSON.stringify({
          ok: false,
          error: { code: "EMAIL_NOT_FOUND", message: "no row for that id" },
        })}
      />,
    );

    expect(screen.getByText(/no longer in the inbox/i)).toBeInTheDocument();
  });
});
