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

  it("shows a reviewed label once the call has been answered", () => {
    render(<ReplyToEmailCard status="complete" parameters={{ id: "e1" }} />);

    expect(screen.getByText("Draft reviewed.")).toBeInTheDocument();
  });
});
