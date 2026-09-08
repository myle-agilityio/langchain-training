import { beforeEach, describe, expect, it, vi } from "vitest";

import { aggregateEmails } from "@/db";
import { count_emails } from "../countEmails";

vi.mock("@/db", () => ({ aggregateEmails: vi.fn() }));

const run = async (input: { filter?: unknown; groupBy?: unknown } = {}) =>
  JSON.parse(
    String(
      await count_emails.invoke(input as never, {
        configurable: { thread_id: "t1" },
      }),
    ),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("count_emails", () => {
  it("defaults to an empty filter so the model can ask for a whole-inbox total", async () => {
    vi.mocked(aggregateEmails).mockResolvedValue({ total: 22 });

    const envelope = await run();

    expect(aggregateEmails).toHaveBeenCalledWith({}, undefined);
    expect(envelope.data.total).toBe(22);
  });

  it("passes both the filter and groupBy through untouched", async () => {
    vi.mocked(aggregateEmails).mockResolvedValue({
      total: 5,
      byGroup: { unread: 5 },
    });

    await run({ filter: { status: "unread" }, groupBy: "status" });

    expect(aggregateEmails).toHaveBeenCalledWith(
      { status: "unread" },
      "status",
    );
  });
});
