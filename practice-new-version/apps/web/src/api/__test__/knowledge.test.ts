import { beforeEach, describe, expect, it, vi } from "vitest";

import { OPENAI_API_KEY_HEADER } from "@repo/constants";
import { apiClient } from "../client";
import { searchKnowledgeBase } from "../knowledge";

const ok = <T>(data: T) => ({ data }) as never;

type RequestConfig = {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
};

const lastConfig = (spy: { mock: { lastCall?: unknown[] } }): RequestConfig =>
  spy.mock.lastCall?.[1] as RequestConfig;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("searchKnowledgeBase", () => {
  it("unwraps the articles and sends the key when there is one", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue(ok({ articles: [{ title: "T", content: "C" }] }));

    await expect(
      searchKnowledgeBase("late work", "sk-teacher"),
    ).resolves.toEqual([{ title: "T", content: "C" }]);
    expect(lastConfig(get)).toEqual({
      params: { query: "late work" },
      headers: { [OPENAI_API_KEY_HEADER]: "sk-teacher" },
    });
  });

  it("omits the header entirely when no key is set", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue(ok({ articles: [] }));

    await searchKnowledgeBase("late work");

    expect(lastConfig(get).headers).toBeUndefined();
  });
});
