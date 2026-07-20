"use client";

import { useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import type { Email } from "@/types/email";
import { useSharedInbox } from "@/hooks/use-shared-inbox";
import { InboxList } from "./inbox-list";
import { EmailDetail } from "./email-detail";

export function EmailInbox() {
  const { emails, patchEmail } = useSharedInbox();
  // Same agent the chat pane binds to (resolved from the surrounding chat
  // configuration), so a run kicked off here streams into that visible chat and
  // its compose_reply interrupt renders the EmailReplyCard there.
  const { agent } = useAgent();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = emails.find((e) => e.id === selectedId) ?? null;

  const selectEmail = (email: Email) => {
    setSelectedId(email.id);
    // Opening an unread email marks it read — same frontend-owns-shared-state
    // pattern as EmailReplyCard's approve handler, just triggered by a read
    // instead of a decision.
    if (email.status === "unread") {
      patchEmail(email.id, { status: "read" });
    }
  };

  const sendManualReply = (id: string, subject: string, body: string) => {
    patchEmail(id, {
      status: "replied",
      reply: { subject, body, sentAt: new Date().toISOString() },
    });
  };

  // Hand the selected email to the agent as a normal chat turn — the system
  // prompt already tells it to classify, search the KB, then call compose_reply,
  // so we just point it at this specific email (id + headers) rather than making
  // it call get_emails and guess which one we mean.
  const askAgentToReply = (email: Email) => {
    agent.addMessage({
      role: "user",
      id: crypto.randomUUID(),
      content:
        `Please analyze and draft a reply to this email for my approval — classify it, ` +
        `search the knowledge base for anything relevant, then compose the reply.\n\n` +
        `Email id: ${email.id}\n` +
        `From: ${email.from.name} <${email.from.email}>\n` +
        `Subject: ${email.subject}`,
    });
    agent.runAgent();
  };

  return (
    <div className="h-full flex">
      <div className="w-[360px] shrink-0 border-r border-[var(--border)] overflow-y-auto thin-scrollbar">
        <InboxList emails={emails} selectedId={selectedId} onSelect={selectEmail} />
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto">
        <EmailDetail
          email={selected}
          onSendReply={sendManualReply}
          onAskAgent={askAgentToReply}
          agentRunning={agent.isRunning}
        />
      </div>
    </div>
  );
}
