import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api";
import { useOpenAIKey } from "@/stores";
import { RelatedArticles } from "..";

const NOT_FOUND = "No related knowledge-base articles found.";
const FAILED = "Couldn't load related knowledge-base articles.";

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
  it("always frames the panel, even before anything is found", () => {
    vi.spyOn(apiClient, "get").mockReturnValue(new Promise(() => {}));
    draw();

    expect(screen.getByText("Related knowledge")).toBeInTheDocument();
  });

  it("lists each article's title and a preview of its content", async () => {
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

  it("says nothing was found rather than showing an empty panel", async () => {
    vi.spyOn(apiClient, "get").mockResolvedValue({
      data: { articles: [] },
    } as never);

    draw();

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
  });

  it("reports a failed lookup inline instead of interrupting with a toast", async () => {
    vi.spyOn(apiClient, "get").mockRejectedValue(new Error("boom"));

    draw();

    await waitFor(() => expect(screen.getByText(FAILED)).toBeInTheDocument());
  });

  it("stays quiet when there is no key to search with", () => {
    useOpenAIKey.setState({ apiKey: null });

    const get = vi.spyOn(apiClient, "get");

    draw();

    expect(get).not.toHaveBeenCalled();
    expect(screen.getByText(NOT_FOUND)).toBeInTheDocument();
  });
});
