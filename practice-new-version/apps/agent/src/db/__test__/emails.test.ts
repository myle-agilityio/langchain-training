import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailFilter } from "@/types";
import {
  aggregateEmails,
  getEmail,
  listEmails,
  toEmail,
  updateEmail,
  type EmailRow,
} from "../emails";

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

// The SQL text of the last query, whitespace-collapsed so assertions ignore its indentation.
const lastSql = (): string =>
  String(mocks.query.mock.lastCall?.[0]).replace(/\s+/g, " ").trim();

const lastParams = (): unknown[] =>
  (mocks.query.mock.lastCall?.[1] ?? []) as unknown[];

const listWith = async (filter: EmailFilter) => {
  mocks.query.mockResolvedValue({ rows: [] });

  await listEmails(filter);
};

beforeEach(() => {
  mocks.query.mockReset();
});

describe("toEmail", () => {
  it("nests the sender and renders received_at as an ISO string", () => {
    const email = toEmail(row());

    expect(email.from).toEqual({
      name: "Flo Beahan",
      email: "flo.beahan93@hotmail.com",
    });
    expect(email.receivedAt).toBe("2026-03-04T09:00:00.000Z");
    expect(email.id).toBe("e1");
    expect(email.status).toBe("unread");
  });

  it("leaves classification undefined for an unclassified row", () => {
    expect(toEmail(row()).classification).toBeUndefined();
  });

  it("assembles classification from its four columns once topic is set", () => {
    const email = toEmail(
      row({
        topic: "grade_dispute",
        course: "math_12",
        work_type: "quiz",
        urgency: "high",
      }),
    );

    expect(email.classification).toEqual({
      topic: "grade_dispute",
      course: "math_12",
      workType: "quiz",
      urgency: "high",
    });
  });

  it("turns a null reply into undefined and passes a stored one through", () => {
    const reply = {
      subject: "Re: Missed test",
      body: "Wednesday works.",
      sentAt: "2026-03-05T10:00:00.000Z",
    };

    expect(toEmail(row()).reply).toBeUndefined();
    expect(toEmail(row({ reply })).reply).toEqual(reply);
  });
});

describe("listEmails — where clause", () => {
  it("omits WHERE entirely when nothing is filtered", async () => {
    await listWith({});

    expect(lastSql()).not.toContain("WHERE");
    expect(lastParams()).toEqual([]);
  });

  it("maps camelCase filter keys to their columns", async () => {
    await listWith({ workType: "quiz" });

    expect(lastSql()).toContain("WHERE work_type = $1");
    expect(lastParams()).toEqual(["quiz"]);
  });

  it("ANDs conditions and numbers placeholders in order", async () => {
    await listWith({ id: "e1", status: "unread", urgency: "high" });

    expect(lastSql()).toContain(
      "WHERE id = $1 AND status = $2 AND urgency = $3",
    );
    expect(lastParams()).toEqual(["e1", "unread", "high"]);
  });

  it("wraps sender and search for ILIKE, reusing one placeholder per pair", async () => {
    await listWith({ sender: "flo" });

    expect(lastSql()).toContain("(from_name ILIKE $1 OR from_email ILIKE $1)");
    expect(lastParams()).toEqual(["%flo%"]);

    await listWith({ search: "quiz" });

    expect(lastSql()).toContain("(subject ILIKE $1 OR body ILIKE $1)");
    expect(lastParams()).toEqual(["%quiz%"]);
  });

  it("keeps numbering in sync when unclassified adds a condition but no param", async () => {
    await listWith({ status: "unread", unclassified: true, sender: "flo" });

    expect(lastSql()).toContain(
      "WHERE status = $1 AND topic IS NULL AND (from_name ILIKE $2 OR from_email ILIKE $2)",
    );
    expect(lastParams()).toEqual(["unread", "%flo%"]);
  });

  it("bounds the date range from both ends", async () => {
    await listWith({
      receivedAfter: "2026-03-01",
      receivedBefore: "2026-03-31",
    });

    expect(lastSql()).toContain(
      "WHERE received_at >= $1 AND received_at <= $2",
    );
    expect(lastParams()).toEqual(["2026-03-01", "2026-03-31"]);
  });

  it("returns rows mapped through toEmail, newest first", async () => {
    mocks.query.mockResolvedValue({ rows: [row(), row({ id: "e2" })] });

    const emails = await listEmails();

    expect(lastSql()).toContain("ORDER BY received_at DESC");
    expect(emails.map((e) => e.id)).toEqual(["e1", "e2"]);
    expect(emails[0].receivedAt).toBe("2026-03-04T09:00:00.000Z");
  });
});

describe("getEmail", () => {
  it("maps the row when found and returns null when the id misses", async () => {
    mocks.query.mockResolvedValue({ rows: [row()] });
    await expect(getEmail("e1")).resolves.toMatchObject({ id: "e1" });
    expect(lastParams()).toEqual(["e1"]);

    mocks.query.mockResolvedValue({ rows: [] });
    await expect(getEmail("nope")).resolves.toBeNull();
  });
});

describe("aggregateEmails", () => {
  it("reads the total straight off count() when nothing is grouped", async () => {
    mocks.query.mockResolvedValue({ rows: [{ n: "12" }] });

    const result = await aggregateEmails({});

    expect(result).toEqual({ total: 12 });
    expect(lastSql()).toContain("count(*) AS n");
  });

  it("applies the same filter as listEmails", async () => {
    mocks.query.mockResolvedValue({ rows: [{ n: "2" }] });

    await aggregateEmails({ status: "unread" });

    expect(lastSql()).toContain("WHERE status = $1");
    expect(lastParams()).toEqual(["unread"]);
  });

  it("groups by the mapped column and buckets null under unclassified", async () => {
    mocks.query.mockResolvedValue({
      rows: [
        { group_value: "quiz", n: "3" },
        { group_value: null, n: "2" },
      ],
    });

    const result = await aggregateEmails({}, "workType");

    expect(lastSql()).toContain(
      "SELECT work_type AS group_value, count(*) AS n",
    );
    expect(result.byGroup).toEqual({ quiz: 3, unclassified: 2 });
  });

  it("derives the grouped total by summing the buckets", async () => {
    mocks.query.mockResolvedValue({
      rows: [
        { group_value: "high", n: "3" },
        { group_value: "low", n: "4" },
      ],
    });

    await expect(aggregateEmails({}, "urgency")).resolves.toMatchObject({
      total: 7,
    });
  });
});

describe("updateEmail", () => {
  it("sends null for every field the patch omits, so COALESCE keeps it", async () => {
    mocks.query.mockResolvedValue({ rows: [row()] });

    await updateEmail("e1", { status: "read" });

    expect(lastParams()).toEqual(["e1", "read", null, null, null, null]);
  });

  it("flattens a classification into its four columns", async () => {
    mocks.query.mockResolvedValue({ rows: [row()] });

    await updateEmail("e1", {
      classification: {
        topic: "absence",
        course: "math_11",
        workType: "none",
        urgency: "low",
      },
    });

    expect(lastParams()).toEqual([
      "e1",
      null,
      "absence",
      "math_11",
      "none",
      "low",
    ]);
  });

  it("returns null when the id matched nothing", async () => {
    mocks.query.mockResolvedValue({ rows: [] });

    await expect(updateEmail("nope", { status: "read" })).resolves.toBeNull();
  });
});
