import { beforeEach, describe, expect, it, vi } from "vitest";

import { CONTACT_PROFILE_NAMESPACE } from "@/constants";
import { listEmails } from "@/db";
import { ERROR_CODE, ERRORS } from "@/errors";
import type { Email } from "@/types";
import { update_contact_profile } from "../updateContactProfile";

vi.mock("@/db", () => ({ listEmails: vi.fn() }));

const email = (name: string, address: string): Email => ({
  id: address,
  from: { name, email: address },
  subject: "s",
  body: "b",
  receivedAt: "2026-03-04T09:00:00.000Z",
  status: "unread",
});

const store = () => ({ get: vi.fn(), put: vi.fn() });

const run = async (
  input: { sender: string; tone?: string; facts?: string[] },
  memory = store(),
) => {
  const result = JSON.parse(
    String(
      await update_contact_profile.invoke(
        input as never,
        {
          configurable: { thread_id: "t1" },
          store: memory,
        } as never,
      ),
    ),
  );

  return { result, memory };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("update_contact_profile", () => {
  it("resolves the sender against the inbox and files the profile under their address", async () => {
    vi.mocked(listEmails).mockResolvedValue([
      email("Flo Beahan", "flo@example.com"),
    ]);

    const memory = store();

    memory.get.mockResolvedValue(undefined);

    const { result } = await run({ sender: "Flo", tone: "formal" }, memory);

    expect(memory.put).toHaveBeenCalledWith(
      CONTACT_PROFILE_NAMESPACE,
      "flo@example.com",
      { name: "Flo Beahan", tone: "formal", facts: [] },
    );
    expect(result.data.profile.email).toBe("flo@example.com");
  });

  it("merges new facts into what is already on file, without duplicates", async () => {
    vi.mocked(listEmails).mockResolvedValue([
      email("Flo Beahan", "flo@example.com"),
    ]);

    const memory = store();

    memory.get.mockResolvedValue({
      value: { name: "Flo Beahan", tone: "warm", facts: ["Parent of Jewell"] },
    });

    await run(
      { sender: "Flo", facts: ["Prefers email", "Parent of Jewell"] },
      memory,
    );

    expect(memory.put.mock.lastCall?.[2]).toEqual({
      name: "Flo Beahan",
      tone: "warm",
      facts: ["Parent of Jewell", "Prefers email"],
    });
  });

  it("keeps the stored tone when the caller sends none", async () => {
    vi.mocked(listEmails).mockResolvedValue([
      email("Flo Beahan", "flo@example.com"),
    ]);

    const memory = store();

    memory.get.mockResolvedValue({
      value: { name: "Flo Beahan", tone: "warm", facts: [] },
    });

    await run({ sender: "Flo" }, memory);

    expect(memory.put.mock.lastCall?.[2].tone).toBe("warm");
  });

  it("refuses to guess when no sender in the inbox matches", async () => {
    vi.mocked(listEmails).mockResolvedValue([]);

    const { result } = await run({ sender: "Nobody" });

    expect(result).toEqual({
      ok: false,
      error: {
        code: ERROR_CODE.SENDER_NOT_FOUND,
        message: ERRORS[ERROR_CODE.SENDER_NOT_FOUND].userMessage,
        recovery: ERRORS[ERROR_CODE.SENDER_NOT_FOUND].recovery,
      },
    });
  });

  it("refuses to pick when more than one sender matches", async () => {
    vi.mocked(listEmails).mockResolvedValue([
      email("Flo Beahan", "flo@example.com"),
      email("Flo Gislason", "flo2@example.com"),
    ]);

    const { result, memory } = await run({ sender: "Flo" });

    expect(result.error.code).toBe(ERROR_CODE.SENDER_AMBIGUOUS);
    expect(memory.put).not.toHaveBeenCalled();
  });

  it("treats several emails from one address as one contact", async () => {
    vi.mocked(listEmails).mockResolvedValue([
      email("Flo Beahan", "flo@example.com"),
      email("Flo Beahan", "flo@example.com"),
    ]);

    const memory = store();

    memory.get.mockResolvedValue(undefined);

    const { result } = await run({ sender: "Flo" }, memory);

    expect(result.ok).toBe(true);
  });

  it("fails loudly when the graph was compiled without a store", async () => {
    vi.mocked(listEmails).mockResolvedValue([
      email("Flo Beahan", "flo@example.com"),
    ]);

    const result = JSON.parse(
      String(
        await update_contact_profile.invoke({ sender: "Flo" } as never, {
          configurable: { thread_id: "t1" },
        }),
      ),
    );

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(ERROR_CODE.INTERNAL);
  });
});
