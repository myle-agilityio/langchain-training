import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { REPLY_DECISION } from "@repo/constants";
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
        result={`The teacher ${REPLY_DECISION.APPROVED} this draft and it has been sent.`}
      />,
    );

    expect(screen.getByText("Draft approved and sent.")).toBeInTheDocument();
  });

  it("reports a rejection once the teacher declined it", () => {
    render(
      <ReplyToEmailCard
        status="complete"
        parameters={{ id: "e1" }}
        result={`The teacher ${REPLY_DECISION.REJECTED} this draft and nothing was sent.`}
      />,
    );

    expect(
      screen.getByText("Draft rejected — nothing sent."),
    ).toBeInTheDocument();
  });

  it("reports the send failed once approved but patchEmail errored", () => {
    render(
      <ReplyToEmailCard
        status="complete"
        parameters={{ id: "e1" }}
        result={`The teacher said yes to sending this draft, but ${REPLY_DECISION.SEND_FAILED} due to a server error.`}
      />,
    );

    expect(
      screen.getByText("Approved, but sending failed."),
    ).toBeInTheDocument();
  });

  it("reports an error for anything else — e.g. composeEmailErrorHandler's backstop after a crash mid-approval", () => {
    render(
      <ReplyToEmailCard
        status="complete"
        parameters={{ id: "e1" }}
        result="That took too long to come back. Tell the teacher in one short line and stop."
      />,
    );

    expect(
      screen.getByText("Something went wrong with this draft."),
    ).toBeInTheDocument();
  });
});
