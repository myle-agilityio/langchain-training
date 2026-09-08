import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { ERROR_MESSAGE, STATUS_LABEL } from "@/constants";
import { ERROR_CODE } from "@/types";
import { UpdateEmailStatusCard } from "..";

type Props = Parameters<typeof UpdateEmailStatusCard>[0];

let queryClient: QueryClient;

const wrap = (children: ReactNode) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const card = (result?: string, parameters: Props["parameters"] = {}) =>
  render(
    wrap(
      <UpdateEmailStatusCard
        status="complete"
        parameters={parameters}
        result={result}
      />,
    ),
  );

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
});

describe("UpdateEmailStatusCard", () => {
  it("counts the patches it is applying, in the singular and plural", () => {
    card(undefined, { patches: [{ id: "a", status: "read" }] });
    expect(screen.getByText("Updating 1 email…")).toBeInTheDocument();

    card(undefined, {
      patches: [
        { id: "a", status: "read" },
        { id: "b", status: "read" },
      ],
    });
    expect(screen.getByText("Updating 2 emails…")).toBeInTheDocument();
  });

  it("falls back to a bare label before the patches arrive", () => {
    card(undefined, {});

    expect(screen.getByText("Updating…")).toBeInTheDocument();
  });

  it("badges each row with the status it ended on", () => {
    card(
      JSON.stringify({
        ok: true,
        data: {
          results: [
            { id: "aaaaaaaa-0000", ok: true, status: "replied" },
            { id: "bbbbbbbb-0000", ok: true, status: "flagged_for_followup" },
          ],
        },
      }),
    );

    expect(screen.getByText(STATUS_LABEL.replied)).toBeInTheDocument();
    expect(
      screen.getByText(STATUS_LABEL.flagged_for_followup),
    ).toBeInTheDocument();
  });

  it("explains a row that failed without dropping the others", () => {
    card(
      JSON.stringify({
        ok: true,
        data: {
          results: [
            { id: "aaaaaaaa-0000", ok: true, status: "read" },
            {
              id: "bbbbbbbb-0000",
              ok: false,
              error: {
                code: ERROR_CODE.STATUS_TRANSITION_INVALID,
                message: "raw",
              },
            },
          ],
        },
      }),
    );

    expect(screen.getByText(STATUS_LABEL.read)).toBeInTheDocument();
    expect(
      screen.getByText(ERROR_MESSAGE[ERROR_CODE.STATUS_TRANSITION_INVALID]),
    ).toBeInTheDocument();
  });
});
