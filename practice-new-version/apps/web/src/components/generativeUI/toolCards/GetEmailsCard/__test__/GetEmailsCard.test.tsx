import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ERROR_MESSAGE } from "@/constants";
import { ERROR_CODE } from "@/types";
import { GetEmailsCard } from "..";

const email = (id: string, name: string) => ({
  id,
  from: { name },
  subject: `Subject ${id}`,
  status: "unread" as const,
});

const envelope = (count: number, names: string[]) =>
  JSON.stringify({
    ok: true,
    data: { count, emails: names.map((n, i) => email(String(i), n)) },
  });

const card = (result?: string, filter = {}) =>
  render(
    <GetEmailsCard status="complete" parameters={{ filter }} result={result} />,
  );

describe("GetEmailsCard", () => {
  it("waits rather than showing an empty result while the tool is still running", () => {
    card(undefined);

    expect(screen.getByText("Fetching emails…")).toBeInTheDocument();
  });

  it("waits on a payload that arrived cut short", () => {
    card('{"ok":tr');

    expect(screen.getByText("Fetching emails…")).toBeInTheDocument();
  });

  it("shows catalog wording for a failure, never the agent's own message", () => {
    card(
      JSON.stringify({
        ok: false,
        error: {
          code: ERROR_CODE.DB_UNAVAILABLE,
          message: "connection refused at 10.0.0.4:5432",
        },
      }),
    );

    expect(
      screen.getByText(ERROR_MESSAGE[ERROR_CODE.DB_UNAVAILABLE]),
    ).toBeInTheDocument();
    expect(screen.queryByText(/10\.0\.0\.4/)).not.toBeInTheDocument();
  });

  it("says so plainly when the filter matched nothing", () => {
    card(envelope(0, []));

    expect(screen.getByText("No emails matched.")).toBeInTheDocument();
  });

  it("counts in the singular for one email", () => {
    card(envelope(1, ["Flo Beahan"]));

    expect(screen.getByText("1 email")).toBeInTheDocument();
    expect(screen.getByText("Flo Beahan")).toBeInTheDocument();
  });

  it("counts in the plural beyond one", () => {
    card(envelope(2, ["Flo Beahan", "Felix Gislason"]));

    expect(screen.getByText("2 emails")).toBeInTheDocument();
  });

  it("caps the rows it lists and says how many were left out", () => {
    card(envelope(6, ["a", "b", "c", "d", "e", "f"]));

    expect(screen.getByText("d")).toBeInTheDocument();
    expect(screen.queryByText("e")).not.toBeInTheDocument();
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });

  it("shows the filter the model actually used as chips", () => {
    card(envelope(0, []), { status: "unread", sender: "" });

    expect(screen.getByText("status: unread")).toBeInTheDocument();
    expect(screen.queryByText(/^sender:/)).not.toBeInTheDocument();
  });
});
