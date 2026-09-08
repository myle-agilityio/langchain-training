import { beforeEach, describe, expect, it, vi } from "vitest";

import { ensureSchema } from "../schema";

const query = vi.fn();

vi.mock("../pool", () => ({ getPool: () => ({ query }) }));

const sqlOf = (index: number) =>
  String(query.mock.calls[index][0]).replace(/\s+/g, " ").trim();

beforeEach(() => {
  query.mockReset().mockResolvedValue({ rows: [] });
});

describe("ensureSchema", () => {
  it("creates every table and index the app owns", async () => {
    await ensureSchema();

    expect(query).toHaveBeenCalledTimes(4);
    expect(sqlOf(0)).toContain("CREATE TABLE IF NOT EXISTS emails");
    expect(sqlOf(1)).toContain(
      "CREATE INDEX IF NOT EXISTS emails_received_at_idx",
    );
    expect(sqlOf(2)).toContain("CREATE TABLE IF NOT EXISTS chat_threads");
    expect(sqlOf(3)).toContain(
      "ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS messages jsonb",
    );
  });

  it("is idempotent — every statement is safe to run against a database that already has it", async () => {
    await ensureSchema();

    for (let i = 0; i < 4; i += 1) {
      expect(sqlOf(i)).toMatch(/IF NOT EXISTS/);
    }
  });
});
