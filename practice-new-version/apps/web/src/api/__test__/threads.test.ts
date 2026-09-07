import { beforeEach, describe, expect, it, vi } from "vitest";

import { THREADS_PAGE_SIZE } from "@/constants";
import { OPENAI_API_KEY_HEADER, USER_ID_HEADER } from "@repo/constants";
import { useUserId } from "@/stores";
import { apiClient } from "../client";
import {
  deleteThread,
  fetchThreads,
  renameThread,
  saveThread,
} from "../threads";

const ok = <T>(data: T) => ({ data }) as never;

type RequestConfig = {
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
};

const configAt = (
  spy: { mock: { lastCall?: unknown[] } },
  index: number,
): RequestConfig => spy.mock.lastCall?.[index] as RequestConfig;

beforeEach(() => {
  vi.restoreAllMocks();
  useUserId.setState({ userId: "user-abc" });
});

describe("fetchThreads", () => {
  it("scopes the read to this browser's id and pages with the shared size", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue(ok({ threads: [], hasNext: false }));

    await fetchThreads(0, "grading");

    expect(configAt(get, 1).params).toEqual({
      limit: THREADS_PAGE_SIZE,
      offset: 0,
      search: "grading",
    });
    expect(configAt(get, 1).headers).toEqual({
      [USER_ID_HEADER]: "user-abc",
    });
  });

  it("reads the id at call time, so a later id is the one that is sent", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue(ok({ threads: [], hasNext: false }));

    useUserId.setState({ userId: "user-xyz" });
    await fetchThreads(0);

    expect(configAt(get, 1).headers).toEqual({
      [USER_ID_HEADER]: "user-xyz",
    });
  });
});

describe("saveThread", () => {
  it("forwards the teacher's key only when there is one", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue(ok({}));

    await saveThread({ id: "t1" }, "sk-teacher");
    expect(configAt(post, 2).headers).toEqual({
      [USER_ID_HEADER]: "user-abc",
      [OPENAI_API_KEY_HEADER]: "sk-teacher",
    });

    await saveThread({ id: "t1" }, null);
    expect(configAt(post, 2).headers).toEqual({
      [USER_ID_HEADER]: "user-abc",
    });
  });
});

describe("renameThread and deleteThread", () => {
  it("scope the write to the owner", async () => {
    const patch = vi.spyOn(apiClient, "patch").mockResolvedValue(ok({}));
    const del = vi.spyOn(apiClient, "delete").mockResolvedValue(ok({}));

    await renameThread("t1", "Renamed");
    expect(patch).toHaveBeenCalledWith(
      "/api/threads",
      { id: "t1", title: "Renamed" },
      { headers: { [USER_ID_HEADER]: "user-abc" } },
    );

    await deleteThread("t1");
    expect(del).toHaveBeenCalledWith("/api/threads", {
      params: { id: "t1" },
      headers: { [USER_ID_HEADER]: "user-abc" },
    });
  });
});
