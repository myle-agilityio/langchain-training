import { describe, expect, it } from "vitest";

import {
  formatReceivedAt,
  formatReceivedAtFull,
  formatRelative,
} from "@/utils";

// Built from local parts, not a UTC string, so the calendar-day maths is stable in any timezone.
const at = (y: number, m: number, d: number, h = 0, min = 0, s = 0): string =>
  new Date(y, m - 1, d, h, min, s).toISOString();

const now = new Date(2026, 2, 4, 15, 0); // Wed 4 Mar 2026, 3pm local

describe("formatReceivedAt", () => {
  it("shows a clock time for today", () => {
    expect(formatReceivedAt(at(2026, 3, 4, 9, 5), now)).toMatch(
      /^\d{1,2}:\d{2} (AM|PM)$/,
    );
  });

  it("shows a clock time for a message dated slightly ahead of now", () => {
    expect(formatReceivedAt(at(2026, 3, 5, 9, 0), now)).toMatch(
      /^\d{1,2}:\d{2} (AM|PM)$/,
    );
  });

  it("names yesterday rather than showing a date", () => {
    expect(formatReceivedAt(at(2026, 3, 3, 9, 0), now)).toBe("Yesterday");
  });

  it("shows the weekday inside the last week", () => {
    expect(formatReceivedAt(at(2026, 3, 1, 9, 0), now)).toMatch(
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/,
    );
  });

  it("drops the year for an older date in the current year", () => {
    expect(formatReceivedAt(at(2026, 2, 22, 9, 0), now)).toBe("Feb 22");
  });

  it("keeps the year once the date is from another year", () => {
    expect(formatReceivedAt(at(2025, 12, 20, 9, 0), now)).toBe("Dec 20, 2025");
  });

  it("renders nothing for an unparseable timestamp", () => {
    expect(formatReceivedAt("not-a-date", now)).toBe("");
  });
});

describe("formatRelative", () => {
  // Narrow en-US wording: "5m ago", "3h ago", "2d ago".
  it("says just now under a minute", () => {
    expect(formatRelative(at(2026, 3, 4, 14, 59, 40), now)).toBe("just now");
  });

  it("counts in minutes below an hour", () => {
    expect(formatRelative(at(2026, 3, 4, 14, 55), now)).toBe("5m ago");
  });

  it("counts in hours below a day, rounding to the nearest", () => {
    expect(formatRelative(at(2026, 3, 4, 12, 0), now)).toBe("3h ago");
    expect(formatRelative(at(2026, 3, 4, 13, 30), now)).toBe("2h ago");
  });

  it("counts in days beyond that", () => {
    expect(formatRelative(at(2026, 3, 2, 15, 0), now)).toBe("2d ago");
  });

  it("renders nothing for an unparseable timestamp", () => {
    expect(formatRelative("nope", now)).toBe("");
  });
});

describe("formatReceivedAtFull", () => {
  it("renders a full local timestamp", () => {
    expect(formatReceivedAtFull(at(2026, 3, 4, 9, 0))).toContain("2026");
  });

  it("renders nothing for an unparseable timestamp", () => {
    expect(formatReceivedAtFull("")).toBe("");
  });
});
