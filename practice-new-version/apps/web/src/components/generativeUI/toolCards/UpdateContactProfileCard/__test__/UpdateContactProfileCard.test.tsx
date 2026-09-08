import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UpdateContactProfileCard } from "..";

type Props = Parameters<typeof UpdateContactProfileCard>[0];

const card = (result?: string, parameters: Props["parameters"] = {}) =>
  render(
    <UpdateContactProfileCard
      status="complete"
      parameters={parameters}
      result={result}
    />,
  );

const saved = (profile: {
  name: string;
  tone: string | null;
  facts: string[];
}) => JSON.stringify({ ok: true, data: { profile } });

describe("UpdateContactProfileCard", () => {
  it("names who it is saving notes about while it works", () => {
    card(undefined, { sender: "Flo Beahan" });

    expect(screen.getByText("Saving notes on Flo Beahan…")).toBeInTheDocument();
  });

  it("falls back to a bare label when the sender is not known yet", () => {
    card(undefined);

    expect(screen.getByText("Saving…")).toBeInTheDocument();
  });

  it("shows the saved name, tone and facts", () => {
    card(
      saved({
        name: "Flo Beahan",
        tone: "formal",
        facts: ["Parent of Jewell", "Prefers email"],
      }),
    );

    expect(screen.getByText("Flo Beahan")).toBeInTheDocument();
    expect(screen.getByText("formal")).toBeInTheDocument();
    expect(screen.getByText("Parent of Jewell")).toBeInTheDocument();
    expect(screen.getByText("Prefers email")).toBeInTheDocument();
  });

  it("leaves out the tone row when none was recorded", () => {
    card(saved({ name: "Flo Beahan", tone: null, facts: [] }));

    expect(screen.getByText("Flo Beahan")).toBeInTheDocument();
    expect(screen.queryByText("Tone")).not.toBeInTheDocument();
  });
});
