import { beforeEach, describe, expect, it, vi } from "vitest";

import { listEmails } from "@/db";
import type { Email } from "@/types";
import { get_emails } from "../getEmails";

vi.mock("@/db", () => ({ listEmails: vi.fn() }));

const email = (id: string): Email => ({
  id,
  from: { name: "Flo Beahan", email: "flo@example.com" },
  subject: "Missed test Monday",
  body: "Jewell was absent.",
  receivedAt: "2026-03-04T09:00:00.000Z",
  status: "unread",
});

const run = async (filter?: unknown) =>
  JSON.parse(
    String(
      await get_emails.invoke({ filter } as never, {
        configurable: { thread_id: "t1" },
      }),
    ),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("get_emails", () => {
  it("passes the filter through and reports the count alongside the list", async () => {
    vi.mocked(listEmails).mockResolvedValue([email("a"), email("b")]);

    const envelope = await run({ status: "unread" });

    expect(listEmails).toHaveBeenCalledWith({ status: "unread" });
    expect(envelope.data.count).toBe(2);
    expect(envelope.data.emails).toHaveLength(2);
  });

  it("redacts the sender's address before it reaches the model", async () => {
    vi.mocked(listEmails).mockResolvedValue([email("a")]);

    const envelope = await run();

    expect(envelope.data.emails[0].from).toEqual({ name: "Flo Beahan" });
  });
});
