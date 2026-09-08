import axios from "axios";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OPENAI_API_KEY_HEADER, USER_ID_HEADER } from "@repo/constants";
import {
  deleteThread,
  listThreads,
  renameThread,
  threadExists,
  upsertThread,
} from "@/db";
import { ERROR_CODE } from "@/errors";
import { errorHandler } from "../middleware";
import { threadsApp } from "../threads";
import type { AppEnv } from "../types";

vi.mock("@/db", () => ({
  listThreads: vi.fn(),
  upsertThread: vi.fn(),
  threadExists: vi.fn(),
  renameThread: vi.fn(),
  deleteThread: vi.fn(),
}));

const app = () => {
  const instance = new Hono<AppEnv>();

  instance.use("*", async (c, next) => {
    c.set("requestId", "req-1");
    await next();
  });
  instance.route("/api/threads", threadsApp);
  instance.onError(errorHandler);

  return instance;
};

const OWNED = { [USER_ID_HEADER]: "user-abc" };

const call = (path: string, init: RequestInit = {}) =>
  app().request(path, {
    ...init,
    headers: { ...OWNED, "Content-Type": "application/json", ...init.headers },
  });

const savedTitle = () => vi.mocked(upsertThread).mock.lastCall?.[2];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.mocked(upsertThread).mockResolvedValue({ id: "t1" } as never);
  vi.stubEnv("OPENAI_API_KEY", undefined);
});

describe("threads routes — ownership", () => {
  it("refuses every route without the browser's id", async () => {
    const response = await app().request("/api/threads");

    expect(response.status).toBe(400);
    expect(listThreads).not.toHaveBeenCalled();
  });
});

describe("GET /api/threads", () => {
  it("scopes the list to the caller and pages by default", async () => {
    vi.mocked(listThreads).mockResolvedValue({ threads: [], hasNext: false });

    await call("/api/threads");

    expect(listThreads).toHaveBeenCalledWith(20, 0, "user-abc", undefined);
  });

  it("passes a search term and an explicit page through", async () => {
    vi.mocked(listThreads).mockResolvedValue({ threads: [], hasNext: false });

    await call("/api/threads?limit=5&offset=10&search=grading");

    expect(listThreads).toHaveBeenCalledWith(5, 10, "user-abc", "grading");
  });
});

describe("POST /api/threads", () => {
  it("titles a brand-new thread from its first message", async () => {
    vi.mocked(threadExists).mockResolvedValue(false);

    await call("/api/threads", {
      method: "POST",
      body: JSON.stringify({ id: "t1", firstMessage: "reply to Flo" }),
    });

    expect(savedTitle()).toBe("reply to Flo");
  });

  it("never re-titles a thread that already exists", async () => {
    vi.mocked(threadExists).mockResolvedValue(true);

    await call("/api/threads", {
      method: "POST",
      body: JSON.stringify({ id: "t1", firstMessage: "reply to Flo" }),
    });

    expect(savedTitle()).toBeNull();
  });

  it("truncates a long first message rather than titling with all of it", async () => {
    vi.mocked(threadExists).mockResolvedValue(false);

    await call("/api/threads", {
      method: "POST",
      body: JSON.stringify({ id: "t1", firstMessage: "x".repeat(120) }),
    });

    expect(String(savedTitle())).toHaveLength(61);
    expect(String(savedTitle()).endsWith("…")).toBe(true);
  });

  it("asks the model for a title when the visitor sent a key", async () => {
    vi.mocked(threadExists).mockResolvedValue(false);

    const post = vi.spyOn(axios, "post").mockResolvedValue({
      data: { choices: [{ message: { content: '"Grading questions"' } }] },
    });

    await call("/api/threads", {
      method: "POST",
      body: JSON.stringify({ id: "t1", firstMessage: "reply to Flo" }),
      headers: { [OPENAI_API_KEY_HEADER]: "sk-teacher" },
    });

    expect(post).toHaveBeenCalled();
    expect(savedTitle()).toBe("Grading questions");
  });

  it("falls back to the truncated message when the title call fails", async () => {
    vi.mocked(threadExists).mockResolvedValue(false);
    vi.spyOn(axios, "post").mockRejectedValue(new Error("rate limited"));

    await call("/api/threads", {
      method: "POST",
      body: JSON.stringify({ id: "t1", firstMessage: "reply to Flo" }),
      headers: { [OPENAI_API_KEY_HEADER]: "sk-teacher" },
    });

    expect(savedTitle()).toBe("reply to Flo");
    expect(console.warn).toHaveBeenCalled();
  });

  it("leaves the title unset when there was no first message to work from", async () => {
    vi.mocked(threadExists).mockResolvedValue(false);

    await call("/api/threads", {
      method: "POST",
      body: JSON.stringify({ id: "t1" }),
    });

    expect(savedTitle()).toBeNull();
  });

  it("normalises an empty content snapshot to null so it cannot wipe what is stored", async () => {
    vi.mocked(threadExists).mockResolvedValue(true);

    await call("/api/threads", {
      method: "POST",
      body: JSON.stringify({ id: "t1", content: "   " }),
    });

    expect(vi.mocked(upsertThread).mock.lastCall?.[3]).toBeNull();
    expect(vi.mocked(upsertThread).mock.lastCall?.[4]).toBeNull();
  });
});

describe("PATCH /api/threads", () => {
  it("renames a thread the caller owns", async () => {
    vi.mocked(renameThread).mockResolvedValue({ id: "t1" } as never);

    const response = await call("/api/threads", {
      method: "PATCH",
      body: JSON.stringify({ id: "t1", title: "Renamed" }),
    });

    expect(await response.json()).toEqual({ thread: { id: "t1" } });
    expect(renameThread).toHaveBeenCalledWith("t1", "user-abc", "Renamed");
  });

  it("reports a thread that is not the caller's as not found", async () => {
    vi.mocked(renameThread).mockResolvedValue(null);

    const response = await call("/api/threads", {
      method: "PATCH",
      body: JSON.stringify({ id: "t1", title: "Renamed" }),
    });

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe(
      ERROR_CODE.THREAD_NOT_FOUND,
    );
  });
});

describe("DELETE /api/threads", () => {
  it("deletes only within the caller's own threads", async () => {
    const response = await call("/api/threads?id=t1", { method: "DELETE" });

    expect(await response.json()).toEqual({ ok: true });
    expect(deleteThread).toHaveBeenCalledWith("t1", "user-abc");
  });

  it("needs an id to delete", async () => {
    const response = await call("/api/threads", { method: "DELETE" });

    expect(response.status).toBe(400);
    expect(deleteThread).not.toHaveBeenCalled();
  });
});
