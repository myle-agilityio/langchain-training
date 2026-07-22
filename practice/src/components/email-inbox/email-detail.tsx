"use client";

import { useEffect, useState } from "react";
import type { Email } from "@/types/email";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComposeForm } from "./compose-form";
import {
  COURSE_LABEL,
  TOPIC_LABEL,
  TOPIC_TONE,
  URGENCY_TONE,
  WORK_TYPE_LABEL,
} from "./inbox-list";
import { formatReceivedAtFull } from "@/lib/format-date";
import { Mail, Sparkles } from "lucide-react";

interface EmailDetailProps {
  email: Email | null;
  onSendReply: (id: string, subject: string, body: string) => void;
  onAskAgent: (email: Email) => void;
  // True while the agent is drafting OR paused awaiting approval — either way a new
  // draft can't be started. agentBusyLabel says which state we're in.
  agentBusy: boolean;
  agentBusyLabel: string;
}

export function EmailDetail({
  email,
  onSendReply,
  onAskAgent,
  agentBusy,
  agentBusyLabel,
}: EmailDetailProps) {
  const [composing, setComposing] = useState(false);

  // Switching to a different email shouldn't leave a stale draft open against
  // the previously selected one.
  useEffect(() => {
    setComposing(false);
  }, [email?.id]);

  if (!email) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <Mail className="h-8 w-8 text-[var(--muted-foreground)]" />
        <p className="text-sm text-[var(--muted-foreground)]">
          Select an email to read it
        </p>
      </div>
    );
  }

  return (
    // pt-20 clears the fixed Chat/App toggle (top-4 + ~46px tall) pinned at the
    // panel's top-right, so a long subject's first line doesn't render under it.
    <div className="max-w-2xl mx-auto px-8 pb-8 pt-20">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--foreground)]">
          {email.subject}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">
            {email.from.name}
          </span>
          <span>&lt;{email.from.email}&gt;</span>
          <span>·</span>
          <time dateTime={email.receivedAt} suppressHydrationWarning>
            {formatReceivedAtFull(email.receivedAt)}
          </time>
        </div>
        {email.classification && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            <Badge
              variant="tone"
              className={TOPIC_TONE[email.classification.topic]}
            >
              {TOPIC_LABEL[email.classification.topic]}
            </Badge>
            {/* Unlike the list row, the detail pane has room for workType too —
                same "none" suppression so unrelated mail stays uncluttered. */}
            {email.classification.course !== "none" && (
              <Badge variant="outline">
                {COURSE_LABEL[email.classification.course]}
              </Badge>
            )}
            {email.classification.workType !== "none" && (
              <Badge variant="outline">
                {WORK_TYPE_LABEL[email.classification.workType]}
              </Badge>
            )}
            <Badge
              // Solid only for `high`, matching the inbox list's treatment split.
              variant={email.classification.urgency === "high" ? "toneSolid" : "tone"}
              className={URGENCY_TONE[email.classification.urgency]}
            >
              {email.classification.urgency} urgency
            </Badge>
          </div>
        )}
      </div>

      <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--foreground)]">
        {email.body}
      </p>

      <div className="mt-8 pt-6 border-t border-[var(--border)]">
        {email.reply ? (
          // Green-tinted, matching the "Replied" badge — a sent reply is the one
          // resolved/terminal state in this pane, so it reads as done at a glance.
          <div className="tone-green">
            <p className="text-xs font-semibold text-[var(--tone)] mb-2">
              Your reply — sent {new Date(email.reply.sentAt).toLocaleString()}
            </p>
            <div className="rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--tone)_28%,transparent)] bg-[color-mix(in_srgb,var(--tone)_8%,var(--background))] p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {email.reply.subject}
              </p>
              <p className="text-sm mt-2 whitespace-pre-wrap text-[var(--foreground)]">
                {email.reply.body}
              </p>
            </div>
          </div>
        ) : composing ? (
          <ComposeForm
            initialSubject={`Re: ${email.subject}`}
            onSend={(subject, body) => {
              onSendReply(email.id, subject, body);
              setComposing(false);
            }}
            onCancel={() => setComposing(false)}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {/* Analyze + draft via the agent — the reply comes back as an
                editable approval card in the chat pane, not applied directly. */}
            <Button
              variant="outline"
              onClick={() => onAskAgent(email)}
              disabled={agentBusy}
            >
              <Sparkles className="h-4 w-4" />
              {agentBusy ? agentBusyLabel : "Ask AI to draft"}
            </Button>
            <Button onClick={() => setComposing(true)}>Compose reply</Button>
          </div>
        )}
      </div>
    </div>
  );
}
