import { beforeEach, describe, expect, it, vi } from "vitest";

import { getEmail, updateEmail } from "@/db";
import { ERROR_CODE, ERRORS } from "@/errors";
import type { Email } from "@/types";
import { update_email_status } from "../updateEmailStatus";

vi.mock("@/db", () => ({ getEmail: vi.fn(), updateEmail: vi.fn() }));

const email = (overrides: Partial<Email> = {}): Email => ({
  id: "a",
  from: { name: "Flo", email: "flo@example.com" },
  subject: "s",
  body: "b",
  receivedAt: "2026-03-04T09:00:00.000Z",
  status: "unread",
  ...overrides,
});

const run = async (patches: { id: string; status: string }[]) =>
  JSON.parse(
    String(
      await update_email_status.invoke({ patches } as never, {
        configurable: { thread_id: "t1" },
      }),
    ),
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("update_email_status", () => {
  it("reports the status each email ended on", async () => {
    vi.mocked(getEmail).mockResolvedValue(email());
    vi.mocked(updateEmail).mockResolvedValue(email({ status: "read" }));

    const envelope = await run([{ id: "a", status: "read" }]);

    expect(envelope).toEqual({
      ok: true,
      data: { results: [{ id: "a", ok: true, status: "read" }] },
    });
  });

  it("applies every patch in one call", async () => {
    vi.mocked(getEmail).mockResolvedValue(email());
    vi.mocked(updateEmail).mockResolvedValue(email({ status: "read" }));

    await run([
      { id: "a", status: "read" },
      { id: "b", status: "read" },
    ]);

    expect(updateEmail).toHaveBeenCalledTimes(2);
  });

  it("fails only the row that is missing, keeping the rest of the batch", async () => {
    vi.mocked(getEmail).mockImplementation(async (id) =>
      id === "a" ? email() : null,
    );
    vi.mocked(updateEmail).mockResolvedValue(email({ status: "read" }));

    const envelope = await run([
      { id: "a", status: "read" },
      { id: "gone", status: "read" },
    ]);

    expect(envelope.data.results[0].ok).toBe(true);
    expect(envelope.data.results[1]).toEqual({
      id: "gone",
      ok: false,
      error: {
        code: ERROR_CODE.EMAIL_NOT_FOUND,
        message: ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].userMessage,
        recovery: ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].recovery,
      },
    });
  });

  it("tells the model how to recover once anything in the batch failed", async () => {
    vi.mocked(getEmail).mockResolvedValue(null);

    const envelope = await run([{ id: "gone", status: "read" }]);

    expect(envelope.data.recovery).toBe(
      ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].recovery,
    );
  });

  it("says nothing about recovery when the whole batch worked", async () => {
    vi.mocked(getEmail).mockResolvedValue(email());
    vi.mocked(updateEmail).mockResolvedValue(email({ status: "read" }));

    const envelope = await run([{ id: "a", status: "read" }]);

    expect(envelope.data.recovery).toBeUndefined();
  });

  it("refuses to un-read an email that was already replied to", async () => {
    vi.mocked(getEmail).mockResolvedValue(email({ status: "replied" }));

    const envelope = await run([{ id: "a", status: "unread" }]);

    expect(envelope.data.results[0].error.code).toBe(
      ERROR_CODE.STATUS_TRANSITION_INVALID,
    );
    expect(updateEmail).not.toHaveBeenCalled();
  });

  // The enum rejects in the tool layer, before defineTool's try/catch — so this rejects rather
  // than returning an envelope. Either way the write never reaches the database.
  it("has no way to mark an email replied", async () => {
    await expect(run([{ id: "a", status: "replied" }])).rejects.toThrow(
      /did not match expected schema/,
    );
    expect(getEmail).not.toHaveBeenCalled();
  });

  it("turns the whole call into one failure when something unexpected throws", async () => {
    vi.mocked(getEmail).mockRejectedValue(new Error("pool exhausted"));

    const envelope = await run([{ id: "a", status: "read" }]);

    expect(envelope.ok).toBe(false);
    expect(JSON.stringify(envelope)).not.toContain("pool exhausted");
  });
});

describe("update_email_status — the write itself failing", () => {
  it("reports a not-found when the row disappears between the read and the write", async () => {
    vi.mocked(getEmail).mockResolvedValue(email());
    vi.mocked(updateEmail).mockResolvedValue(null);

    const envelope = await run([{ id: "a", status: "read" }]);

    expect(envelope.data.results[0]).toEqual({
      id: "a",
      ok: false,
      error: {
        code: ERROR_CODE.EMAIL_NOT_FOUND,
        message: ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].userMessage,
        recovery: ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].recovery,
      },
    });
  });
});
