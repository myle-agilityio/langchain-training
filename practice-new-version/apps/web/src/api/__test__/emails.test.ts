import { beforeEach, describe, expect, it, vi } from "vitest";

import { EMAILS_PAGE_SIZE } from "@/constants";
import { apiClient } from "../client";
import { fetchEmails, patchEmail, patchEmails } from "../emails";

const ok = <T>(data: T) => ({ data }) as never;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchEmails", () => {
  it("pages the inbox with the shared page size", async () => {
    const get = vi
      .spyOn(apiClient, "get")
      .mockResolvedValue(ok({ emails: [{ id: "e1" }], hasNext: true }));

    await expect(fetchEmails(40)).resolves.toEqual({
      emails: [{ id: "e1" }],
      hasNext: true,
    });
    expect(get).toHaveBeenCalledWith("/api/emails", {
      params: { limit: EMAILS_PAGE_SIZE, offset: 40 },
    });
  });
});

describe("patchEmail", () => {
  it("unwraps the single email the route returns", async () => {
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue(ok({ email: { id: "e1", status: "read" } }));

    await expect(patchEmail("e1", { status: "read" })).resolves.toEqual({
      id: "e1",
      status: "read",
    });
    expect(patch).toHaveBeenCalledWith("/api/emails", {
      id: "e1",
      patch: { status: "read" },
    });
  });
});

describe("patchEmails", () => {
  it("sends one request for a bulk patch rather than one per row", async () => {
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue(ok({ emails: [{ id: "a" }, { id: "b" }] }));

    await expect(patchEmails(["a", "b"], { status: "read" })).resolves.toEqual([
      { id: "a" },
      { id: "b" },
    ]);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith("/api/emails", {
      ids: ["a", "b"],
      patch: { status: "read" },
    });
  });
});
