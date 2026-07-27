"use client";

import { useState } from "react";
import { useAgent, useAgentContext, useCopilotKit } from "@copilotkit/react-core/v2";
import type { Email } from "@/types/email";
import { useSharedInbox } from "@/hooks/use-shared-inbox";
import { InboxList } from "./inbox-list";
import { EmailDetail } from "./email-detail";

export function EmailInbox() {
  const { emails, isLoading, isRefreshing, refresh, patchEmail } = useSharedInbox();
  const { agent } = useAgent();
  // Run through the CopilotKit core, not agent.runAgent() directly: the core's runAgent is the
  // same interrupt-aware path CopilotChat uses, so compose_reply's pause is routed to
  // useEmailAgent's useInterrupt card rather than left unhandled.
  const { copilotkit } = useCopilotKit();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = emails.find((e) => e.id === selectedId) ?? null;

  // Publish which email the teacher currently has open as readable agent context, so a bare
  // "reply this email" resolves without them pasting an id.
  useAgentContext({
    description:
      "The email the teacher currently has open in the inbox UI. When they say 'this email', " +
      "'this one', 'reply this', or similar without naming a person, they mean this email — " +
      "use its id.",
    value: selected
      ? { id: selected.id, from: selected.from.name, subject: selected.subject }
      : "No email is currently open in the inbox.",
  });

  const selectEmail = (email: Email) => {
    setSelectedId(email.id);
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

  const askAgentToReply = (email: Email) => {
    agent.addMessage({
      role: "user",
      id: crypto.randomUUID(),
      content:
        `Draft a reply to this email for my approval.\n\n` +
        `Email id: ${email.id}\n` +
        `From: ${email.from.name} <${email.from.email}>\n` +
        `Subject: ${email.subject}`,
    });
    copilotkit.runAgent({ agent });
  };

  // Block a second draft while the agent is mid-run OR paused on an unresolved interrupt:
  // after the pause the run has finished (isRunning is false), but pendingInterrupts stays
  // populated until the approval card is answered.
  const awaitingApproval = (agent.pendingInterrupts?.length ?? 0) > 0;
  const agentBusy = agent.isRunning || awaitingApproval;

  return (
    <div className="h-full flex">
      <div className="w-[360px] shrink-0 border-r border-[var(--border)] overflow-y-auto thin-scrollbar">
        <InboxList
          emails={emails}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
          selectedId={selectedId}
          onSelect={selectEmail}
        />
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto">
        <EmailDetail
          email={selected}
          isLoading={isLoading}
          onSendReply={sendManualReply}
          onAskAgent={askAgentToReply}
          agentBusy={agentBusy}
        />
      </div>
    </div>
  );
}
