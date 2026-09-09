import { describe, expect, it } from "vitest";

import type { Email } from "@/types";
import { EMPTY_FILTERS, filterEmails, hasActiveFilters } from "@/utils";

const email = (overrides: Partial<Email> = {}): Email => ({
  id: "e1",
  from: { name: "Flo Beahan", email: "flo.beahan93@hotmail.com" },
  subject: "Missed test Monday",
  body: "Jewell was absent on Monday.",
  receivedAt: "2026-03-04T09:00:00.000Z",
  status: "unread",
  ...overrides,
});

describe("hasActiveFilters", () => {
  it("is false for empty filters and for cleared-to-empty-string fields", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ from: "", subject: undefined })).toBe(false);
  });

  it("is true once any field carries a value", () => {
    expect(hasActiveFilters({ status: "unread" })).toBe(true);
  });
});

describe("filterEmails", () => {
  const emails = [
    email({ id: "a", status: "unread" }),
    email({ id: "b", status: "replied", subject: "Late project" }),
  ];

  it("returns everything when no filter is set", () => {
    expect(filterEmails(emails, EMPTY_FILTERS)).toHaveLength(2);
  });

  it("matches sender name and address case-insensitively", () => {
    expect(filterEmails(emails, { from: "BEAHAN" })).toHaveLength(2);
    expect(filterEmails(emails, { from: "hotmail" })).toHaveLength(2);
    expect(filterEmails(emails, { from: "connelly" })).toHaveLength(0);
  });

  it("ands every active filter together", () => {
    const found = filterEmails(emails, {
      status: "replied",
      subject: "project",
    });

    expect(found.map((e) => e.id)).toEqual(["b"]);
    expect(
      filterEmails(emails, { status: "unread", subject: "project" }),
    ).toHaveLength(0);
  });

  it("search ors across sender, subject and body instead of anding them", () => {
    expect(filterEmails(emails, { search: "beahan" })).toHaveLength(2);
    expect(filterEmails(emails, { search: "late project" })).toHaveLength(1);
    expect(
      filterEmails(emails, { search: "nothing matches this" }),
    ).toHaveLength(0);
  });

  it("treats receivedBefore as an inclusive date, ignoring the time of day", () => {
    expect(filterEmails(emails, { receivedBefore: "2026-03-04" })).toHaveLength(
      2,
    );
    expect(filterEmails(emails, { receivedBefore: "2026-03-03" })).toHaveLength(
      0,
    );
    expect(filterEmails(emails, { receivedAfter: "2026-03-04" })).toHaveLength(
      2,
    );
  });
});
