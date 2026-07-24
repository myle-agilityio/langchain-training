import { AIMessage, type BaseMessage } from "@langchain/core/messages";

import type { Email } from "../types/index.js";

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

export function renderEmail(email: Email): string {
  return [
    `From: ${email.from.name} <${email.from.email}>`,
    `Subject: ${email.subject}`,
    `Received: ${email.receivedAt}`,
    "",
    email.body,
  ].join("\n");
}
