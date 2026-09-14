import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReplyToEmailCard } from "..";

describe("ReplyToEmailCard", () => {
  it("shows a pending label while the draft is in progress", () => {
    render(<ReplyToEmailCard status="executing" parameters={{ id: "e1" }} />);

    expect(
      screen.getByText("Drafting a reply for approval…"),
    ).toBeInTheDocument();
  });

  it("reports an approval once the teacher sent it", () => {
    render(
      <ReplyToEmailCard
        status="complete"
        parameters={{ id: "e1" }}
        result="The teacher approved this draft and it has been sent."
      />,
    );

    expect(screen.getByText("Draft approved and sent.")).toBeInTheDocument();
  });

  it("reports a rejection once the teacher declined it", () => {
    render(
      <ReplyToEmailCard
        status="complete"
        parameters={{ id: "e1" }}
        result="The teacher rejected this draft and nothing was sent."
      />,
    );

    expect(
      screen.getByText("Draft rejected — nothing sent."),
    ).toBeInTheDocument();
  });

  it("falls back to a generic label for anything else (e.g. a failure)", () => {
    render(
      <ReplyToEmailCard
        status="complete"
        parameters={{ id: "e1" }}
        result="That took too long to come back. Tell the teacher in one short line and stop."
      />,
    );

    expect(screen.getByText("Draft reviewed.")).toBeInTheDocument();
  });
});
