import { beforeEach, describe, expect, it, vi } from "vitest";

import { seedEmails } from "@/data";
import type { EmailRow } from "../emails";
import { listEmailsSeeded, patchEmail, updateEmailsStatus } from "../inbox";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("../pool", () => ({ getPool: () => ({ query: mocks.query }) }));

const row = (overrides: Partial<EmailRow> = {}): EmailRow => ({
  id: "e1",
  from_name: "Flo Beahan",
  from_email: "flo.beahan93@hotmail.com",
  subject: "Missed test Monday",
  body: "Jewell was absent.",
  received_at: new Date("2026-03-04T09:00:00.000Z"),
  status: "unread",
  topic: null,
  course: null,
  work_type: null,
  urgency: null,
  reply: null,
  ...overrides,
});

const sqlOf = (call: unknown[]): string =>
  String(call[0]).replace(/\s+/g, " ").trim();

const lastParams = (): unknown[] =>
  (mocks.query.mock.lastCall?.[1] ?? []) as unknown[];

// A populated inbox: ensureSeeded's COUNT short-circuits, then the page query runs.
const alreadySeeded = (rows: EmailRow[]) => {
  mocks.query
    .mockResolvedValueOnce({ rows: [{ count: "22" }] })
    .mockResolvedValueOnce({ rows });
};

beforeEach(() => {
  mocks.query.mockReset();
});

describe("listEmailsSeeded — seeding", () => {
  it("inserts nothing when the inbox already has rows", async () => {
    alreadySeeded([]);

    await listEmailsSeeded(10, 0);

    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(
      mocks.query.mock.calls.some((c) => sqlOf(c).includes("INSERT INTO")),
    ).toBe(false);
  });

  it("inserts every sample email, in order, on an empty inbox", async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValue({ rows: [] });

    await listEmailsSeeded(10, 0);

    const inserts = mocks.query.mock.calls.filter((c) =>
      sqlOf(c).includes("INSERT INTO emails"),
    );

    expect(inserts).toHaveLength(seedEmails.length);
    expect(inserts.map((c) => (c[1] as unknown[])[0])).toEqual(
      seedEmails.map((e) => e.id),
    );
  });

  it("writes a full 12-column row per seed and never overwrites an existing id", async () => {
    mocks.query
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValue({ rows: [] });

    await listEmailsSeeded(10, 0);

    const [insert] = mocks.query.mock.calls.filter((c) =>
      sqlOf(c).includes("INSERT INTO emails"),
    );
    const params = insert[1] as unknown[];
    const seed = seedEmails[0];

    expect(sqlOf(insert)).toContain("ON CONFLICT (id) DO NOTHING");
    expect(params).toHaveLength(12);
    expect(params.slice(0, 7)).toEqual([
      seed.id,
      seed.from.name,
      seed.from.email,
      seed.subject,
      seed.body,
      seed.receivedAt,
      seed.status,
    ]);
    expect(params.slice(7, 11)).toEqual([
      seed.classification?.topic ?? null,
      seed.classification?.course ?? null,
      seed.classification?.workType ?? null,
      seed.classification?.urgency ?? null,
    ]);
  });
});

describe("listEmailsSeeded — pagination", () => {
  it("asks for one row past the page so it can tell there is a next one", async () => {
    alreadySeeded([]);

    await listEmailsSeeded(20, 40);

    expect(lastParams()).toEqual([21, 40]);
  });

  it("reports no next page when the extra row does not come back", async () => {
    alreadySeeded([row({ id: "a" }), row({ id: "b" })]);

    const page = await listEmailsSeeded(2, 0);

    expect(page.hasNext).toBe(false);
    expect(page.emails.map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("drops the extra row from the page but reports a next one", async () => {
    alreadySeeded([row({ id: "a" }), row({ id: "b" }), row({ id: "c" })]);

    const page = await listEmailsSeeded(2, 0);

    expect(page.hasNext).toBe(true);
    expect(page.emails.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("updateEmailsStatus", () => {
  it("updates the whole id list in one statement and maps what comes back", async () => {
    mocks.query.mockResolvedValue({ rows: [row({ status: "read" })] });

    const updated = await updateEmailsStatus(["a", "b"], "read");

    expect(sqlOf(mocks.query.mock.lastCall!)).toContain(
      "WHERE id = ANY($2::text[])",
    );
    expect(lastParams()).toEqual(["read", ["a", "b"]]);
    expect(updated[0].status).toBe("read");
  });

  it("returns an empty list when no id matched", async () => {
    mocks.query.mockResolvedValue({ rows: [] });

    await expect(updateEmailsStatus(["nope"], "read")).resolves.toEqual([]);
  });
});

describe("patchEmail", () => {
  it("sends null for every omitted field, so COALESCE keeps it", async () => {
    mocks.query.mockResolvedValue({ rows: [row()] });

    await patchEmail("e1", { status: "read" });

    expect(lastParams()).toEqual(["e1", "read", null, null, null, null, null]);
  });

  it("serializes a reply to JSON for the jsonb column", async () => {
    const reply = {
      subject: "Re: Missed test",
      body: "Wednesday works.",
      sentAt: "2026-03-05T10:00:00.000Z",
    };

    mocks.query.mockResolvedValue({ rows: [row({ reply })] });

    await patchEmail("e1", { reply });

    expect(lastParams()[6]).toBe(JSON.stringify(reply));
  });

  it("returns null when the id matched nothing", async () => {
    mocks.query.mockResolvedValue({ rows: [] });

    await expect(patchEmail("nope", { status: "read" })).resolves.toBeNull();
  });
});
