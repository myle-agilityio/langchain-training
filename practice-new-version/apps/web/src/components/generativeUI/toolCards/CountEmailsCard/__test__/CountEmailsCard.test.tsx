import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ERROR_MESSAGE } from "@/constants";
import { ERROR_CODE } from "@/types";
import { CountEmailsCard } from "..";

type Props = Parameters<typeof CountEmailsCard>[0];

const card = (result?: string, parameters: Props["parameters"] = {}) =>
  render(
    <CountEmailsCard
      status="complete"
      parameters={parameters}
      result={result}
    />,
  );

const counted = (total: number, byGroup?: Record<string, number>) =>
  JSON.stringify({ ok: true, data: { total, byGroup } });

describe("CountEmailsCard", () => {
  it("waits while the count is still running", () => {
    card(undefined);

    expect(screen.getByText("Counting…")).toBeInTheDocument();
  });

  it("shows catalog wording for a failure", () => {
    card(
      JSON.stringify({
        ok: false,
        error: { code: ERROR_CODE.DB_UNAVAILABLE, message: "raw detail" },
      }),
    );

    expect(
      screen.getByText(ERROR_MESSAGE[ERROR_CODE.DB_UNAVAILABLE]),
    ).toBeInTheDocument();
    expect(screen.queryByText("raw detail")).not.toBeInTheDocument();
  });

  it("counts in the singular and the plural", () => {
    card(counted(1));
    expect(screen.getByText("email")).toBeInTheDocument();

    card(counted(9));
    expect(screen.getByText("emails")).toBeInTheDocument();
  });

  it("orders the breakdown by size, biggest first", () => {
    card(counted(9, { unread: 2, read: 6, replied: 1 }), {
      groupBy: "status",
    });

    const labels = screen
      .getAllByText(/^(Unread|Read|Replied)$/)
      .map((el) => el.textContent);

    expect(labels).toEqual(["Read", "Unread", "Replied"]);
  });

  it("names each bucket with its own label set", () => {
    card(counted(3, { grade_dispute: 3 }), { groupBy: "topic" });

    expect(screen.getByText("Grade dispute")).toBeInTheDocument();
  });

  it("names the null bucket rather than showing a blank row", () => {
    card(counted(2, { unclassified: 2 }), { groupBy: "topic" });

    expect(screen.getByText("Unclassified")).toBeInTheDocument();
  });

  it("shows a bare total when nothing was grouped", () => {
    card(counted(4));

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.queryByText("Unclassified")).not.toBeInTheDocument();
  });
});
