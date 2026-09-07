import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { ERROR_MESSAGE } from "@/constants";
import { inboxQueryKey } from "@/hooks";
import { ERROR_CODE } from "@/types";
import { ClassifyEmailsCard } from "..";

let queryClient: QueryClient;

const wrap = (children: ReactNode) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const card = (result?: string, ids: string[] = []) =>
  render(
    wrap(
      <ClassifyEmailsCard
        status="complete"
        parameters={{ ids }}
        result={result}
      />,
    ),
  );

const classified = JSON.stringify({
  ok: true,
  data: {
    results: [
      {
        id: "1d4ff3e7-81b9-4d39-ad26-1e93e622d363",
        ok: true,
        classification: {
          topic: "grade_dispute",
          course: "math_12",
          workType: "quiz",
          urgency: "high",
        },
      },
      {
        id: "beefbeef-0000-0000-0000-000000000000",
        ok: false,
        error: { code: ERROR_CODE.EMAIL_NOT_FOUND, message: "raw" },
      },
    ],
  },
});

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(inboxQueryKey, {
    pageParams: [0],
    pages: [
      {
        emails: [
          {
            id: "1d4ff3e7-81b9-4d39-ad26-1e93e622d363",
            from: { name: "Flo Beahan", email: "flo@example.com" },
            subject: "Missed test Monday",
            body: "body",
            receivedAt: "2026-03-04T09:00:00.000Z",
            status: "unread",
          },
        ],
        hasNext: false,
      },
    ],
  });
});

describe("ClassifyEmailsCard", () => {
  it("counts what it is working through, in the singular and plural", () => {
    card(undefined, ["a"]);
    expect(screen.getByText("Classifying 1 email…")).toBeInTheDocument();

    card(undefined, ["a", "b"]);
    expect(screen.getByText("Classifying 2 emails…")).toBeInTheDocument();
  });

  it("falls back to a bare label before the ids arrive", () => {
    card(undefined, []);

    expect(screen.getByText("Classifying…")).toBeInTheDocument();
  });

  it("resolves each id to its sender and subject", () => {
    card(classified);

    expect(screen.getByText("Flo Beahan")).toBeInTheDocument();
    expect(screen.getByText(/Missed test Monday/)).toBeInTheDocument();
  });

  it("shows a short id for a row the inbox no longer holds", () => {
    card(classified);

    expect(screen.getByText("beefbeef")).toBeInTheDocument();
  });

  it("badges the ones that worked and explains the ones that did not", () => {
    card(classified);

    expect(screen.getByText("Grade dispute")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(
      screen.getByText(ERROR_MESSAGE[ERROR_CODE.EMAIL_NOT_FOUND]),
    ).toBeInTheDocument();
  });

  it("shows catalog wording when the whole call failed", () => {
    card(
      JSON.stringify({
        ok: false,
        error: { code: ERROR_CODE.RATE_LIMITED, message: "raw" },
      }),
    );

    expect(
      screen.getByText(ERROR_MESSAGE[ERROR_CODE.RATE_LIMITED]),
    ).toBeInTheDocument();
  });
});
