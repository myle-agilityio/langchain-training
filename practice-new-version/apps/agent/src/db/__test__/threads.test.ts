import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteThread,
  getThreadMessages,
  listThreads,
  renameThread,
  threadExists,
  upsertThread,
} from "../threads";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("../pool", () => ({ getPool: () => ({ query: mocks.query }) }));

interface Row {
  id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

const row = (overrides: Partial<Row> = {}): Row => ({
  id: "t1",
  title: "Grading questions",
  created_at: new Date("2026-03-04T09:00:00.000Z"),
  updated_at: new Date("2026-03-05T11:30:00.000Z"),
  ...overrides,
});

const lastSql = (): string =>
  String(mocks.query.mock.lastCall?.[0]).replace(/\s+/g, " ").trim();

const lastParams = (): unknown[] =>
  (mocks.query.mock.lastCall?.[1] ?? []) as unknown[];

beforeEach(() => {
  mocks.query.mockReset();
});

describe("listThreads — scoping", () => {
  it("filters to the owner and asks for one row past the page", async () => {
    mocks.query.mockResolvedValue({ rows: [] });

    await listThreads(20, 40, "user-1");

    expect(lastSql()).toContain("WHERE user_id = $3");
    expect(lastSql()).not.toContain("ILIKE");
    expect(lastParams()).toEqual([21, 40, "user-1"]);
  });

  it("adds the search term as a fourth param used by both columns", async () => {
    mocks.query.mockResolvedValue({ rows: [] });

    await listThreads(20, 0, "user-1", "grading");

    expect(lastSql()).toContain(
      "WHERE user_id = $3 AND (title ILIKE $4 OR content ILIKE $4)",
    );
    expect(lastParams()).toEqual([21, 0, "user-1", "%grading%"]);
  });

  it("orders by most recently touched", async () => {
    mocks.query.mockResolvedValue({ rows: [] });

    await listThreads(20, 0, "user-1");

    expect(lastSql()).toContain("ORDER BY updated_at DESC");
  });
});

describe("listThreads — pagination and mapping", () => {
  it("reports no next page when the extra row does not come back", async () => {
    mocks.query.mockResolvedValue({
      rows: [row({ id: "a" }), row({ id: "b" })],
    });

    const page = await listThreads(2, 0, "user-1");

    expect(page.hasNext).toBe(false);
    expect(page.threads.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("drops the extra row from the page but reports a next one", async () => {
    mocks.query.mockResolvedValue({
      rows: [row({ id: "a" }), row({ id: "b" }), row({ id: "c" })],
    });

    const page = await listThreads(2, 0, "user-1");

    expect(page.hasNext).toBe(true);
    expect(page.threads.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("renders both timestamps as ISO strings and keeps an untitled thread null", async () => {
    mocks.query.mockResolvedValue({ rows: [row({ title: null })] });

    const [thread] = (await listThreads(10, 0, "user-1")).threads;

    expect(thread).toEqual({
      id: "t1",
      title: null,
      createdAt: "2026-03-04T09:00:00.000Z",
      updatedAt: "2026-03-05T11:30:00.000Z",
    });
  });
});

describe("upsertThread", () => {
  it("defaults content and messages to null so COALESCE keeps what is stored", async () => {
    mocks.query.mockResolvedValue({ rows: [row()] });

    await upsertThread("t1", "user-1", "Grading questions");

    expect(lastParams()).toEqual([
      "t1",
      "user-1",
      "Grading questions",
      null,
      null,
    ]);
  });

  it("serializes the transcript for the jsonb column", async () => {
    const messages = [{ role: "user", content: "hi" }];

    mocks.query.mockResolvedValue({ rows: [row()] });

    await upsertThread("t1", "user-1", null, "hi", messages);

    expect(lastParams()[4]).toBe(JSON.stringify(messages));
  });

  it("leaves user_id and title alone on conflict", async () => {
    mocks.query.mockResolvedValue({ rows: [row()] });

    await upsertThread("t1", "user-1", "Grading questions");

    expect(lastSql()).toContain("ON CONFLICT (id) DO UPDATE SET");
    expect(lastSql()).not.toContain("user_id = EXCLUDED");
    expect(lastSql()).not.toContain("title = EXCLUDED");
  });

  it("only bumps updated_at when the transcript actually changed", async () => {
    mocks.query.mockResolvedValue({ rows: [row()] });

    await upsertThread("t1", "user-1", null, "hi", [{ role: "user" }]);

    expect(lastSql()).toContain(
      "WHEN COALESCE(EXCLUDED.messages, chat_threads.messages) IS DISTINCT FROM chat_threads.messages",
    );
    expect(lastSql()).toContain("THEN now()");
    expect(lastSql()).toContain("ELSE chat_threads.updated_at");
  });

  it("returns the mapped row", async () => {
    mocks.query.mockResolvedValue({ rows: [row()] });

    await expect(upsertThread("t1", "user-1", null)).resolves.toMatchObject({
      id: "t1",
      updatedAt: "2026-03-05T11:30:00.000Z",
    });
  });
});

describe("getThreadMessages", () => {
  it("returns the stored transcript", async () => {
    const messages = [{ role: "user", content: "hi" }];

    mocks.query.mockResolvedValue({ rows: [{ messages }] });

    await expect(getThreadMessages("t1")).resolves.toEqual(messages);
  });

  it("returns null for a thread with no transcript and for a missing thread", async () => {
    mocks.query.mockResolvedValue({ rows: [{ messages: null }] });
    await expect(getThreadMessages("t1")).resolves.toBeNull();

    mocks.query.mockResolvedValue({ rows: [] });
    await expect(getThreadMessages("nope")).resolves.toBeNull();
  });
});

describe("threadExists", () => {
  it("is true only when a row comes back", async () => {
    mocks.query.mockResolvedValue({ rows: [{ id: "t1" }] });
    await expect(threadExists("t1")).resolves.toBe(true);

    mocks.query.mockResolvedValue({ rows: [] });
    await expect(threadExists("nope")).resolves.toBe(false);
  });
});

describe("renameThread", () => {
  it("scopes the rename to the owner", async () => {
    mocks.query.mockResolvedValue({ rows: [row({ title: "Renamed" })] });

    const thread = await renameThread("t1", "user-1", "Renamed");

    expect(lastSql()).toContain("WHERE id = $1 AND user_id = $2");
    expect(lastParams()).toEqual(["t1", "user-1", "Renamed"]);
    expect(thread?.title).toBe("Renamed");
  });

  it("returns null when the thread is not the caller's", async () => {
    mocks.query.mockResolvedValue({ rows: [] });

    await expect(
      renameThread("t1", "someone-else", "Nope"),
    ).resolves.toBeNull();
  });
});

describe("deleteThread", () => {
  it("scopes the delete to the owner", async () => {
    mocks.query.mockResolvedValue({ rows: [] });

    await deleteThread("t1", "user-1");

    expect(lastSql()).toContain(
      "DELETE FROM chat_threads WHERE id = $1 AND user_id = $2",
    );
    expect(lastParams()).toEqual(["t1", "user-1"]);
  });
});
