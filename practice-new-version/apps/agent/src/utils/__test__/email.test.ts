import { beforeEach, describe, expect, it, vi } from "vitest";

import { getEmail } from "@/db";
import type { Email } from "@/types";
import { fetchEmailById } from "@/utils";

vi.mock("@/db", () => ({ getEmail: vi.fn() }));

const email: Email = {
  id: "e1",
  from: { name: "Flo Beahan", email: "flo.beahan93@hotmail.com" },
  subject: "Missed test Monday",
  body: "Jewell was absent.",
  receivedAt: "2026-03-04T09:00:00.000Z",
  status: "unread",
};

describe("fetchEmailById", () => {
  beforeEach(() => {
    vi.mocked(getEmail).mockReset();
  });

  it("passes the id through and returns what the row maps to", async () => {
    vi.mocked(getEmail).mockResolvedValue(email);

    await expect(fetchEmailById("e1")).resolves.toEqual(email);
    expect(getEmail).toHaveBeenCalledWith("e1");
  });

  it("returns null for a miss", async () => {
    vi.mocked(getEmail).mockResolvedValue(null);

    await expect(fetchEmailById("nope")).resolves.toBeNull();
  });

  it("normalizes undefined to null, so callers only branch on one empty value", async () => {
    vi.mocked(getEmail).mockResolvedValue(undefined as unknown as Email);

    await expect(fetchEmailById("nope")).resolves.toBeNull();
  });
});
