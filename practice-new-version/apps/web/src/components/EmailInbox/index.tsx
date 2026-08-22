import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  useAgent,
  useAgentContext,
  useCopilotKit,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import type { Email } from "@/types/email";
import { useSharedInbox } from "@/stores/useSharedInbox";
import {
  EMPTY_FILTERS,
  filterEmails,
  hasActiveFilters,
  type EmailFilters,
} from "@/lib/emailFilters";
import { InboxList } from "./InboxList";
import { EmailDetail } from "./emailDetail";
import { FilterDialog } from "./FilterDialog";

export const EmailInbox = () => {
  const emails = useSharedInbox((s) => s.emails);
  const isLoading = useSharedInbox((s) => s.isLoading);
  const isRefreshing = useSharedInbox((s) => s.isRefreshing);
  const refresh = useSharedInbox((s) => s.refresh);
  const patchEmail = useSharedInbox((s) => s.patchEmail);
  const patchEmails = useSharedInbox((s) => s.patchEmails);
  const { agent } = useAgent();
  // Run through the CopilotKit core, not agent.runAgent() directly — same interrupt-aware path
  // CopilotChat uses, so compose_reply's pause routes to useEmailAgent's useInterrupt card.
  const { copilotkit } = useCopilotKit();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<EmailFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isFiltered = hasActiveFilters(filters);
  const visibleEmails = useMemo(
    () => filterEmails(emails, filters),
    [emails, filters],
  );

  // Same fields the filter dialog offers, so the agent can do anything the teacher can here.
  useFrontendTool(
    {
      name: "filterInbox",
      description:
        "Set the filters on the inbox list the teacher is looking at. When they ask to SEE a " +
        'subset of the inbox — "show me...", "only show...", "let me see..." — call this ' +
        "to filter their view; don't just list the emails in chat. Each call replaces the " +
        "current filters with exactly the fields given; call with no fields to clear all " +
        "filters. Dates are ISO (YYYY-MM-DD), inclusive. This only changes what the teacher " +
        "sees on screen — to read emails yourself, use get_emails instead. When" +
        "the teacher ask about unreplied emails, filter the read emails, not unread ones.",
      parameters: z.object({
        status: z
          .enum(["unread", "read", "replied", "flagged_for_followup"])
          .optional(),
        urgency: z.enum(["low", "medium", "high"]).optional(),
        course: z.enum(["math_11", "math_12"]).optional(),
        topic: z
          .enum([
            "question",
            "submission",
            "review_request",
            "grade_dispute",
            "absence",
            "scheduling",
            "admin",
            "complex",
          ])
          .optional(),
        workType: z
          .enum(["practice", "exercise", "homework", "quiz", "test", "project"])
          .optional(),
        from: z.string().optional(),
        subject: z.string().optional(),
        hasWords: z.string().optional(),
        receivedAfter: z.string().optional(),
        receivedBefore: z.string().optional(),
      }),
      handler: async (args) => {
        const next = Object.fromEntries(
          Object.entries(args).filter(([, v]) => v !== undefined && v !== ""),
        ) as EmailFilters;
        setFilters(next);
        const visible = filterEmails(emails, next);
        return hasActiveFilters(next)
          ? `Filters applied — ${visible.length} of ${emails.length} emails visible.`
          : "Filters cleared — all emails visible.";
      },
    },
    [emails],
  );

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

  // Opens one email in the detail pane, same as the teacher clicking it in the list.
  useFrontendTool(
    {
      name: "showEmail",
      description:
        "Open one email in the reading pane so the teacher can see it on screen. Call this " +
        'whenever they ask about a SINGLE email — "show me...", "open...", "let me see...", ' +
        "or a bare reference to one email they named — instead of describing its contents in " +
        "chat. Give the email's real id; call get_emails first if you only have a description. " +
        "For more than one email use filterInbox instead.",
      parameters: z.object({ id: z.string() }),
      handler: async ({ id }) => {
        const email = emails.find((e) => e.id === id);
        if (!email)
          return `No email with id ${id} — call get_emails for current ids and retry.`;
        selectEmail(email);
        return `Opened "${email.subject}" from ${email.from.name} in the reading pane.`;
      },
    },
    [emails],
  );

  // Per-row toggle: flip between unread/read. A replied email can't go back to unread (the
  // reply already happened); flagged_for_followup still can.
  const toggleRead = (email: Email) => {
    if (email.status === "replied") return;
    patchEmail(email.id, {
      status: email.status === "unread" ? "read" : "unread",
    });
  };

  // Bulk actions only move emails between unread/read — never touch replied/flagged ones, so
  // they can't erase those badges. Acts on visibleEmails (post-filter), not the whole inbox.
  const markAllRead = () => {
    const ids = visibleEmails
      .filter((e) => e.status === "unread")
      .map((e) => e.id);
    patchEmails(ids, { status: "read" });
  };

  const markAllUnread = () => {
    const ids = visibleEmails
      .filter((e) => e.status === "read")
      .map((e) => e.id);
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

  // Block a second draft while mid-run or paused on an interrupt. agent.pendingInterrupts never
  // populates — the LangGraph bridge signals via a CUSTOM "on_interrupt" event instead.
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
    <div className="h-full flex gap-3">
      <div className="w-[360px] shrink-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar">
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
        </div>
        <FilterDialog
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          filters={filters}
          onApply={setFilters}
        />
      </div>
      <div className="flex-1 min-w-0 rounded-xl border border-border bg-card overflow-y-auto">
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
};
