import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { inboxQueryKey } from "@/hooks";
import { EmailLine } from "..";

let queryClient: QueryClient;

const wrap = (children: ReactNode) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

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

describe("EmailLine", () => {
  it("turns an id the tool returned into a sender and subject", () => {
    render(wrap(<EmailLine id="1d4ff3e7-81b9-4d39-ad26-1e93e622d363" />));

    expect(screen.getByText("Flo Beahan")).toBeInTheDocument();
    expect(screen.getByText(/Missed test Monday/)).toBeInTheDocument();
  });

  it("shows a short id when the inbox no longer holds that email", () => {
    render(wrap(<EmailLine id="beefbeef-0000-0000-0000-000000000000" />));

    expect(screen.getByText("beefbeef")).toBeInTheDocument();
  });

  it("prefers a caller's fallback over the short id", () => {
    render(wrap(<EmailLine id="beefbeef-0000" fallback="Unknown sender" />));

    expect(screen.getByText("Unknown sender")).toBeInTheDocument();
  });
});
