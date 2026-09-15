import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api";
import { useOpenAIKey } from "@/stores";
import { RelatedArticles } from "..";

const SEARCHING = "Searching your knowledge base…";
const NOTHING_MATCHED = "Nothing in the knowledge base matched this email.";
const SEARCH_FAILED = "Couldn't search your knowledge base.";

let queryClient: QueryClient;

const wrap = (children: ReactNode) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const draw = (query = "Missed test Monday") =>
  render(wrap(<RelatedArticles query={query} />));

beforeEach(() => {
  vi.restoreAllMocks();
  useOpenAIKey.setState({ apiKey: "sk-teacher" });
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

describe("RelatedArticles", () => {
  it("shows a searching status line — not the card — while the lookup is in flight", () => {
    vi.spyOn(apiClient, "get").mockReturnValue(new Promise(() => {}));
    draw();

    expect(screen.getByText(SEARCHING)).toBeInTheDocument();
    expect(screen.queryByText("Related knowledge")).not.toBeInTheDocument();
  });

  it("lists each article's title and a preview of its content once loaded", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: {
        articles: [
          { title: "Late work policy", content: "10% per day, up to 3 days." },
          { title: "Make-up tests", content: "Within one week." },
        ],
      },
    } as never);

    draw();

    expect(await screen.findByText("Late work policy")).toBeInTheDocument();
    expect(screen.getByText("10% per day, up to 3 days.")).toBeInTheDocument();
    expect(screen.getByText("Make-up tests")).toBeInTheDocument();
  });

  it("shows a 'nothing matched' status line and keeps it up — not the card", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { articles: [] },
    } as never);

    draw();

    expect(await screen.findByText(NOTHING_MATCHED)).toBeInTheDocument();
    expect(screen.queryByText("Related knowledge")).not.toBeInTheDocument();
  });

  it("shows a 'couldn't search' status line and keeps it up on a real lookup failure", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValue(new Error("boom"));

    draw();

    expect(await screen.findByText(SEARCH_FAILED)).toBeInTheDocument();
    expect(screen.queryByText("Related knowledge")).not.toBeInTheDocument();
  });

  it("stays hidden when there is no key to search with", () => {
    const get = vi.spyOn(apiClient, "get");

    useOpenAIKey.setState({ apiKey: null });

    draw();

    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByText("Related knowledge")).not.toBeInTheDocument();
  });
});
