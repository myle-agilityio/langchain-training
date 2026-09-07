import { describe, expect, it } from "vitest";

import type { Email } from "@/types";
import {
  redactEmailForModel,
  redactSecrets,
  redactSensitiveInfo,
  renderEmail,
} from "@/utils";

const email = (overrides: Partial<Email> = {}): Email => ({
  id: "1d4ff3e7-81b9-4d39-ad26-1e93e622d363",
  from: { name: "Flo Beahan", email: "flo.beahan93@hotmail.com" },
  subject: "Missed test Monday",
  body: "Ms. Lam,\n\nJewell was absent.\n\nFlo",
  receivedAt: "2026-03-04T09:00:00.000Z",
  status: "unread",
  ...overrides,
});

describe("redactSensitiveInfo", () => {
  it("redacts emails, street addresses and phone numbers", () => {
    const text =
      "Reach me at parent@example.com or 555-123-4567, 742 Evergreen Terrace.";

    expect(redactSensitiveInfo(text)).toBe(
      "Reach me at [redacted email] or [redacted phone], [redacted address].",
    );
  });

  it("leaves text without PII untouched", () => {
    expect(redactSensitiveInfo("Quiz 3 covers chapter 5.")).toBe(
      "Quiz 3 covers chapter 5.",
    );
  });
});

describe("renderEmail", () => {
  it("lays out the headers, a blank line, then the body", () => {
    const rendered = renderEmail(email());

    expect(rendered).toBe(
      [
        "From: Flo Beahan <[redacted email]>",
        "Subject: Missed test Monday",
        "Received: 2026-03-04T09:00:00.000Z",
        "",
        "Ms. Lam,",
        "",
        "Jewell was absent.",
        "",
        "Flo",
      ].join("\n"),
    );
  });

  it("keeps the sender's name but scrubs PII from the subject and body", () => {
    const rendered = renderEmail(
      email({
        subject: "Re: reach me at flo@hotmail.com",
        body: "Call 555-123-4567 or stop by 742 Evergreen Terrace.",
      }),
    );

    expect(rendered).toContain("From: Flo Beahan <[redacted email]>");
    expect(rendered).toContain("Subject: Re: reach me at [redacted email]");
    expect(rendered).toContain(
      "Call [redacted phone] or stop by [redacted address].",
    );
    expect(rendered).not.toContain("hotmail.com");
  });
});

describe("redactEmailForModel", () => {
  it("drops the sender's address but keeps the name and the rest of the row", () => {
    const redacted = redactEmailForModel(
      email({ classification: undefined, subject: "Missed test Monday" }),
    );

    expect(redacted.from).toEqual({ name: "Flo Beahan" });
    expect(redacted).not.toHaveProperty("from.email");
    expect(redacted.id).toBe("1d4ff3e7-81b9-4d39-ad26-1e93e622d363");
    expect(redacted.receivedAt).toBe("2026-03-04T09:00:00.000Z");
    expect(redacted.status).toBe("unread");
  });

  it("scrubs the subject and body", () => {
    const redacted = redactEmailForModel(
      email({
        subject: "Re: flo@hotmail.com",
        body: "Call 555-123-4567.",
      }),
    );

    expect(redacted.subject).toBe("Re: [redacted email]");
    expect(redacted.body).toBe("Call [redacted phone].");
  });

  it("scrubs a sent reply too, since it is replayed every turn", () => {
    const redacted = redactEmailForModel(
      email({
        reply: {
          subject: "Re: reach me at flo@hotmail.com",
          body: "I'm at 555-123-4567.",
          sentAt: "2026-03-05T10:00:00.000Z",
        },
      }),
    );

    expect(redacted.reply).toEqual({
      subject: "Re: reach me at [redacted email]",
      body: "I'm at [redacted phone].",
      sentAt: "2026-03-05T10:00:00.000Z",
    });
  });

  it("has no reply key when the email was never answered", () => {
    expect(redactEmailForModel(email())).not.toHaveProperty("reply");
  });
});

describe("redactSecrets", () => {
  it("redacts a connection string whole, not half-eaten by the email rule", () => {
    const text = "db: postgresql://user:pw@host.neon.tech/main?sslmode=require";

    expect(redactSecrets(text)).toBe("db: [redacted connection string]");
  });

  it("redacts api keys and bearer tokens", () => {
    expect(redactSecrets("key sk-abcd1234efgh")).toBe("key [redacted key]");
    expect(redactSecrets("Authorization: Bearer abc.def-ghi")).toBe(
      "Authorization: Bearer [redacted]",
    );
  });
});
