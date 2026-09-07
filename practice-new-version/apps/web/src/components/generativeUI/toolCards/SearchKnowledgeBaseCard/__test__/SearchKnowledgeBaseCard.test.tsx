import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ERROR_MESSAGE } from "@/constants";
import { ERROR_CODE } from "@/types";
import { SearchKnowledgeBaseCard } from "..";

const card = (result?: string, query = "late work") =>
  render(
    <SearchKnowledgeBaseCard
      status="complete"
      parameters={{ query }}
      result={result}
    />,
  );

const found = (articles: { title: string; content: string }[]) =>
  JSON.stringify({ ok: true, data: { articles } });

describe("SearchKnowledgeBaseCard", () => {
  it("echoes the query the model searched for", () => {
    card(undefined);

    expect(screen.getByText(/late work/)).toBeInTheDocument();
    expect(screen.getByText("Searching policy notes…")).toBeInTheDocument();
  });

  it("omits the quote line when the model sent no query yet", () => {
    card(undefined, "");

    expect(screen.getByText("Searching policy notes…")).toBeInTheDocument();
  });

  it("lists each hit with a preview", () => {
    card(
      found([
        { title: "Late work policy", content: "10% per day." },
        { title: "Make-up tests", content: "Within one week." },
      ]),
    );

    expect(screen.getByText("Late work policy")).toBeInTheDocument();
    expect(screen.getByText("10% per day.")).toBeInTheDocument();
    expect(screen.getByText("Make-up tests")).toBeInTheDocument();
  });

  it("says nothing relevant turned up", () => {
    card(found([]));

    expect(screen.getByText("Nothing relevant found.")).toBeInTheDocument();
  });

  it("shows catalog wording for a failure", () => {
    card(
      JSON.stringify({
        ok: false,
        error: { code: ERROR_CODE.API_KEY_REJECTED, message: "raw" },
      }),
    );

    expect(
      screen.getByText(ERROR_MESSAGE[ERROR_CODE.API_KEY_REJECTED]),
    ).toBeInTheDocument();
  });
});
