"use client";

import { useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import type { Email } from "@/types/email";
import { InboxList } from "./inbox-list";
import { EmailDetail } from "./email-detail";

export function EmailInbox() {
  const { agent } = useAgent();
  const emails = (agent.state?.emails ?? []) as Email[];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = emails.find((e) => e.id === selectedId) ?? null;

  const selectEmail = (email: Email) => {
    setSelectedId(email.id);
    // Opening an unread email marks it read — same frontend-owns-shared-state
    // pattern as the todos demo and EmailReplyCard's approve handler, just
    // triggered by a read instead of a decision.
    if (email.status === "unread") {
      agent.setState({
        emails: emails.map((e) =>
          e.id === email.id ? { ...e, status: "read" as const } : e,
        ),
      });
    }
  };

  const sendManualReply = (id: string, subject: string, body: string) => {
    agent.setState({
      emails: emails.map((e) =>
        e.id === id
          ? {
              ...e,
              status: "replied" as const,
              reply: { subject, body, sentAt: new Date().toISOString() },
            }
          : e,
      ),
    });
  };

  return (
    <div className="h-full flex">
      <div className="w-[360px] shrink-0 border-r border-[var(--border)] overflow-y-auto thin-scrollbar">
        <InboxList emails={emails} selectedId={selectedId} onSelect={selectEmail} />
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto">
        <EmailDetail email={selected} onSendReply={sendManualReply} />
      </div>
    </div>
  );
}
