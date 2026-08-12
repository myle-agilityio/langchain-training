import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";

import type { Email } from "@/types/index.js";

// Finds the most recent reply_to_email call — the one this entry into the subgraph answers.
export function findReplyCall(messages: BaseMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!AIMessage.isInstance(message)) continue;
    const call = (message.tool_calls ?? []).find((c) => c.name === "reply_to_email");
    if (call) return call;
  }
  return undefined;
}

// What the teacher actually said about this reply — the original request and, on a redraft, the
// "try again, but..." note after a rejection. write_draft otherwise only sees the email and
// researched context, never the teacher's own instructions, so a redraft repeats the same draft.
export function collectRevisionNotes(messages: BaseMessage[], emailId: string): string {
  const callIndices = messages.reduce<number[]>((acc, message, i) => {
    if (!AIMessage.isInstance(message)) return acc;
    const call = (message.tool_calls ?? []).find(
      (c) => c.name === "reply_to_email" && (c.args as { id?: string }).id === emailId,
    );
    return call ? [...acc, i] : acc;
  }, []);
  if (callIndices.length === 0) return "";

  const currentIdx = callIndices[callIndices.length - 1];
  const sinceIdx = callIndices.length > 1 ? callIndices[callIndices.length - 2] : -1;

  return messages
    .slice(sinceIdx + 1, currentIdx)
    .filter((m): m is HumanMessage => HumanMessage.isInstance(m))
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join("\n");
}

// Heuristic regexes, not NER — good enough to keep obvious PII out of every model call without
// a dependency. Order matters: address before phone, since street numbers can look phone-ish.
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
const ADDRESS_RE =
  /\b\d{1,5}\s+(?:[A-Za-z0-9.]+\s){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Circle|Cir|Terrace|Ter|Parkway|Pkwy|Highway|Hwy|Trail|Trl|Square|Sq)\.?\b/gi;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g;

// Strips emails/addresses/phone numbers before text reaches any model call — renderEmail is the
// one place every prompt (classify, research, draft) pulls email content from, so scrubbing here
// covers all of them. The model only ever needs the internal email id (from state), never the
// sender's real contact details, to do its job.
export function redactSensitiveInfo(text: string): string {
  return text
    .replace(EMAIL_RE, "[redacted email]")
    .replace(ADDRESS_RE, "[redacted address]")
    .replace(PHONE_RE, "[redacted phone]");
}

export function renderEmail(email: Email): string {
  return redactSensitiveInfo(
    [
      `From: ${email.from.name} <${email.from.email}>`,
      `Subject: ${email.subject}`,
      `Received: ${email.receivedAt}`,
      "",
      email.body,
    ].join("\n"),
  );
}
