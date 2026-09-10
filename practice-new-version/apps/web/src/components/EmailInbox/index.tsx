import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import {
  useAgent,
  useAgentContext,
  useCopilotKit,
  useFrontendTool,
} from "@copilotkit/react-core/v2";
import type { Email } from "@/types";
import {
  useSharedInbox,
  usePatchEmail,
  usePatchEmails,
  useComposingEmail,
} from "@/hooks";
import { useComposeApproval, useOpenAIKey, useViewMode } from "@/stores";
import { Button } from "@/components/common";
import {
  EMPTY_FILTERS,
  filterEmails,
  hasActiveFilters,
  type EmailFilters,
} from "@/utils";
import { InboxList } from "./InboxList";
import { InboxToolbar } from "./InboxToolbar";
import { EmailDetail } from "./EmailDetail";

export const EmailInbox = () => {
  const {
    emails,
    isLoading,
    isRefreshing,
    refresh,
    loadMore,
    hasMore,
    isLoadingMore,
  } = useSharedInbox();
  const patchEmail = usePatchEmail();
  const patchEmails = usePatchEmails();
  const { agent } = useAgent();
  // Run through the CopilotKit core, not agent.runAgent() directly — same interrupt-aware path
  // CopilotChat uses, so compose_reply's pause routes to useEmailAgent's useInterrupt card.
  const { copilotkit } = useCopilotKit();
  // Kept in the URL (not useState) so refreshing the page reopens the same email.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("emailId");
  // The agent's inbox tools only pay off on the App tab, so they switch to it themselves.
  const setMode = useViewMode((s) => s.setMode);
  const [filters, setFilters] = useState<EmailFilters>(EMPTY_FILTERS);
  const isFiltered = hasActiveFilters(filters);
  const visibleEmails = useMemo(
    () => filterEmails(emails, filters),
    [emails, filters],
  );
  const selected = emails.find((e) => e.id === selectedId) ?? null;

  // One pane, so opening an email replaces the list — the emailId param is what swaps them.
  const setSelectedId = (id: string | null) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);

        if (id === null) {
          next.delete("emailId");
        } else {
          next.set("emailId", id);
        }

        return next;
      },
      { replace: true },
    );
  };

  const selectEmail = (email: Email) => {
    setSelectedId(email.id);

    if (email.status === "unread") {
      patchEmail(email.id, { status: "read" });
    }
  };

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
        // The filtered list is what they asked to see, so leave any open email behind for it.
        setSelectedId(null);
        setMode("app");

        const visible = filterEmails(emails, next);

        return hasActiveFilters(next)
          ? `Filters applied — ${visible.length} of ${emails.length} emails visible.`
          : "Filters cleared — all emails visible.";
      },
    },
    [emails],
  );

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

        if (!email) {
          return `No email with id ${id} — call get_emails for current ids and retry.`;
        }

        selectEmail(email);
        setMode("app");

        return `Opened "${email.subject}" from ${email.from.name} in the reading pane.`;
      },
    },
    [emails],
  );

  // Per-row toggle: flip between unread/read. A replied email can't go back to unread (the
  // reply already happened); flagged_for_followup still can.
  const toggleRead = (email: Email) => {
    if (email.status === "replied") {
      return;
    }

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

  // Block a second draft while mid-run or paused on an interrupt. Fed by useSyncComposeApproval
  // and cleared by the approval card itself, so answering the card unblocks this immediately.
  const awaitingApproval = useComposeApproval((s) => s.awaitingApproval);
  // No key means the chat panel is showing the key form, so a reply drafted here would land
  // somewhere the teacher can't see.
  const hasApiKey = Boolean(useOpenAIKey((s) => s.apiKey));
  const isAgentBusy = agent.isRunning || awaitingApproval || !hasApiKey;

  // Shared agent state: which email the compose pipeline is drafting for, if any.
  const composingEmailId = useComposingEmail();
  const isDrafting =
    composingEmailId !== null && composingEmailId === selected?.id;

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <InboxToolbar
        isLoading={isLoading}
        filters={filters}
        onApplyFilters={setFilters}
        search={filters.search ?? ""}
        onSearchChange={(search) =>
          setFilters((f) => ({ ...f, search: search || undefined }))
        }
      />
      {/* Only this card carries the frosted `bg-panel` — the toolbar above sits directly
          on the canvas, same as ChatPanel's. */}
      {selectedId === null ? (
        <div className="@container flex-1 min-h-0 overflow-y-auto overflow-x-hidden thin-scrollbar rounded-xl bg-panel">
          <InboxList
            emails={visibleEmails}
            totalCount={emails.length}
            isLoading={isLoading}
            isFiltered={isFiltered}
            isRefreshing={isRefreshing}
            onRefresh={refresh}
            onMarkAllRead={markAllRead}
            onMarkAllUnread={markAllUnread}
            selectedId={selectedId}
            onSelect={selectEmail}
            onToggleRead={toggleRead}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            onLoadMore={loadMore}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar rounded-xl bg-panel">
          {/* Same sticky-header treatment as InboxList's own "Inbox (N)" bar, so the two panes
              read as the same kind of card. */}
          <div className="sticky top-0 z-10 flex h-10 items-center border-b border-border bg-card px-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedId(null)}
              aria-label="Back to inbox"
            >
              <ArrowLeft className="h-4 w-4" />
              Inbox
            </Button>
          </div>
          <EmailDetail
            email={selected}
            isLoading={isLoading}
            onSendReply={sendManualReply}
            onAskAgent={askAgentToReply}
            isAgentBusy={isAgentBusy}
            isDrafting={isDrafting}
          />
        </div>
      )}
    </div>
  );
};
