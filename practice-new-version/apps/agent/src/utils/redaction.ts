import type { Email } from "@/types/index";

// Heuristic regexes, not NER — good enough to keep obvious PII out of every model call without
// a dependency. Order matters: address before phone, since street numbers can look phone-ish.
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
const ADDRESS_RE =
  /\b\d{1,5}\s+(?:[A-Za-z0-9.]+\s){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Circle|Cir|Terrace|Ter|Parkway|Pkwy|Highway|Hwy|Trail|Trl|Square|Sq)\.?\b/gi;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g;

// Strips emails/addresses/phone numbers before text reaches any model call — renderEmail is the
// one place every prompt pulls email content from, so scrubbing here covers all of them.
export const redactSensitiveInfo = (text: string): string => {
  return text
    .replace(EMAIL_RE, "[redacted email]")
    .replace(ADDRESS_RE, "[redacted address]")
    .replace(PHONE_RE, "[redacted phone]");
};

export const renderEmail = (email: Email): string => {
  return redactSensitiveInfo(
    [
      `From: ${email.from.name} <${email.from.email}>`,
      `Subject: ${email.subject}`,
      `Received: ${email.receivedAt}`,
      "",
      email.body,
    ].join("\n"),
  );
};

// get_emails' structured counterpart to renderEmail — the ToolMessage stays in history and is
// replayed every turn, so it needs the same scrubbing. Keeps the sender's name, drops the address.
export const redactEmailForModel = (
  email: Email,
): Omit<Email, "from"> & { from: { name: string } } => {
  const { from, ...rest } = email;

  return {
    ...rest,
    from: { name: from.name },
    subject: redactSensitiveInfo(email.subject),
    body: redactSensitiveInfo(email.body),
    ...(email.reply
      ? {
          reply: {
            ...email.reply,
            subject: redactSensitiveInfo(email.reply.subject),
            body: redactSensitiveInfo(email.reply.body),
          },
        }
      : {}),
  };
};

// Credentials that could ride along in a log line: OpenAI keys, bearer tokens, DB URLs.
const SECRET_RE = /\b(?:sk|rk)-[A-Za-z0-9_-]{8,}/g;
const BEARER_RE = /\b[Bb]earer\s+[A-Za-z0-9._-]+/g;
const CONNECTION_RE = /\b(?:postgres(?:ql)?|redis|mongodb):\/\/[^\s"']+/g;

// Applied to every string a log entry carries — logs leave the process, so they get the same
// scrubbing as model input, plus credentials. Credentials go first: a connection string's
// user:password@host would otherwise be eaten by the email rule and only half-redacted.
export const redactSecrets = (text: string): string =>
  redactSensitiveInfo(
    text
      .replace(CONNECTION_RE, "[redacted connection string]")
      .replace(SECRET_RE, "[redacted key]")
      .replace(BEARER_RE, "Bearer [redacted]"),
  );
