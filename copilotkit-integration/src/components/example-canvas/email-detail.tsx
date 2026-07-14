"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmailAnalysisCard } from "@/components/generative-ui/email-analysis-card";
import { Sparkles, CheckCircle2 } from "lucide-react";
import type { Email } from "../../types/types";

interface EmailDetailProps {
  email: Email | null;
  isAgentRunning: boolean;
  onAnalyze: () => void;
}

export function EmailDetail({ email, isAgentRunning, onAnalyze }: EmailDetailProps) {
  if (!email) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-8">
        <div className="text-5xl">📬</div>
        <p className="text-base font-semibold text-[var(--foreground)]">Select an email</p>
        <p className="text-sm text-[var(--muted-foreground)] max-w-xs">
          Pick an email from the inbox to read it, then ask the agent to analyze it -- it'll
          draft a reply or file a bug, depending on what the email needs.
        </p>
      </div>
    );
  }

  const isResolved = email.status === "replied" || email.status === "bug_filed";

  return (
    // pt-16 (vs. pb-8): clears the ModeToggle, which is `fixed top-4 right-4`
    // over the whole viewport rather than scoped to this panel -- a long,
    // wrapped subject line would otherwise render underneath it.
    <div className="max-w-2xl mx-auto px-8 pt-16 pb-8 space-y-6">
      <div>
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-xl font-bold text-[var(--foreground)]">{email.subject}</h1>
          <Badge
            variant={
              email.status === "bug_filed"
                ? "destructive"
                : email.status === "replied"
                  ? "success"
                  : "outline"
            }
            className="shrink-0"
          >
            {email.status === "replied"
              ? "Replied"
              : email.status === "bug_filed"
                ? `Bug filed${email.bugTicketId ? ` · ${email.bugTicketId}` : ""}`
                : email.status === "read"
                  ? "Read"
                  : "Unread"}
          </Badge>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          {email.fromName} &lt;{email.fromEmail}&gt; · {new Date(email.receivedAt).toLocaleString()}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={isAgentRunning || isResolved} onClick={onAnalyze}>
          <Sparkles className="h-3.5 w-3.5" />
          Analyze
        </Button>
      </div>

      {email.classification && <EmailAnalysisCard emailId={email.id} {...email.classification} />}

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--card-foreground)]">
        {email.body}
      </div>

      {email.reply && (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--secondary)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-[#189370]" />
            <span className="text-sm font-semibold text-[var(--foreground)]">Sent reply</span>
          </div>
          <p className="text-sm whitespace-pre-wrap text-[var(--muted-foreground)]">
            {email.reply}
          </p>
        </div>
      )}

      {isAgentRunning && (
        <p className="text-xs text-[var(--muted-foreground)]">
          Agent is working — check the chat for the review card.
        </p>
      )}
    </div>
  );
}
