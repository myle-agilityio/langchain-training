"use client";

import { useState } from "react";
import type { Email } from "@/types/email";
import { useSharedInbox } from "@/hooks/use-shared-inbox";
import { InboxList } from "./inbox-list";
import { EmailDetail } from "./email-detail";

export function EmailInbox() {
  const { emails, patchEmail } = useSharedInbox();
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
