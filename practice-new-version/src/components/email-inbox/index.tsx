"use client";

import { useEffect, useMemo, useState } from "react";
import { useAgent, useAgentContext, useCopilotKit } from "@copilotkit/react-core/v2";
import type { Email } from "@/types/email";
import { useSharedInbox } from "@/hooks/use-shared-inbox";
import { EMPTY_FILTERS, filterEmails, hasActiveFilters, type EmailFilters } from "@/lib/email-filters";
import { InboxList } from "./inbox-list";
import { EmailDetail } from "./email-detail";
import { FilterDialog } from "./filter-dialog";

export function EmailInbox() {
  const { emails, isLoading, isRefreshing, refresh, patchEmail, patchEmails } = useSharedInbox();
  const { agent } = useAgent();
  // Run through the CopilotKit core, not agent.runAgent() directly: the core's runAgent is the
  // same interrupt-aware path CopilotChat uses, so compose_reply's pause is routed to
  // useEmailAgent's useInterrupt card rather than left unhandled.
  const { copilotkit } = useCopilotKit();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<EmailFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isFiltered = hasActiveFilters(filters);
  const visibleEmails = useMemo(() => filterEmails(emails, filters), [emails, filters]);

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

  // Per-row toggle: flip exactly between unread/read. A replied or flagged_for_followup email
  // reverts to unread (mirrors marking a handled thread as needing attention again), matching
  // how Gmail-style clients treat "mark unread" as always available, not read-state-only.
  const toggleRead = (email: Email) => {
    patchEmail(email.id, { status: email.status === "unread" ? "read" : "unread" });
  };

  // Bulk actions only ever move emails between unread and read — never touch replied/flagged
  // ones, so clicking either button can't silently erase a reply/follow-up badge in bulk. Acts
  // on visibleEmails (post-filter), not the whole inbox, so "mark all" means "all of these".
  const markAllRead = () => {
    const ids = visibleEmails.filter((e) => e.status === "unread").map((e) => e.id);
    patchEmails(ids, { status: "read" });
  };

  const markAllUnread = () => {
    const ids = visibleEmails.filter((e) => e.status === "read").map((e) => e.id);
    patchEmails(ids, { status: "unread" });
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

  // Block a second draft while the agent is mid-run OR paused on an unresolved interrupt. Can't
  // use agent.pendingInterrupts here — the LangGraph bridge signals interrupts via a CUSTOM
  // "on_interrupt" event (see use-email-agent.tsx), never via RUN_FINISHED's outcome field, so
  // that property never populates. Track the same event ourselves instead.
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  useEffect(() => {
    const subscription = agent.subscribe({
      onCustomEvent: ({ event }) => {
        if (event.name === "on_interrupt") setAwaitingApproval(true);
      },
      onRunStartedEvent: () => setAwaitingApproval(false),
      onRunFailed: () => setAwaitingApproval(false),
    });
    return () => subscription.unsubscribe();
  }, [agent]);
  const agentBusy = agent.isRunning || awaitingApproval;

  return (
    <div className="h-full flex">
      <div className="w-[360px] shrink-0 border-r border-[var(--border)] overflow-y-auto thin-scrollbar">
        <InboxList
          emails={visibleEmails}
          totalCount={emails.length}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onRefresh={refresh}
          selectedId={selectedId}
          onSelect={selectEmail}
          onToggleRead={toggleRead}
          onMarkAllRead={markAllRead}
          onMarkAllUnread={markAllUnread}
          isFiltered={isFiltered}
          onOpenFilters={() => setFiltersOpen(true)}
        />
        <FilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          filters={filters}
          onApply={setFilters}
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
