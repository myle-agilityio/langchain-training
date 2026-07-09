"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Check, X } from "lucide-react";

export interface ComposeReplyReviewProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
  emailId?: string;
  subject?: string;
  body?: string;
  onApprove: (finalBody: string) => void;
}

export function ComposeReplyReview({
  status,
  respond,
  emailId = "",
  subject = "",
  body = "",
  onApprove,
}: ComposeReplyReviewProps) {
  const [draft, setDraft] = useState(body);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  // args stream in while status is "inProgress" (this component doesn't remount
  // between statuses), so keep the draft synced to the streamed body until the
  // user actually edits it.
  const userEditedRef = useRef(false);
  useEffect(() => {
    if (!userEditedRef.current) setDraft(body);
  }, [body]);

  const handleApprove = () => {
    setDecision("approved");
    onApprove(draft);
    respond?.(`The human approved and sent this reply:\n\n${draft}`);
  };

  const handleReject = () => {
    setDecision("rejected");
    respond?.(
      "The human rejected the draft reply. Ask what they'd like to change, or let them handle it manually.",
    );
  };

  if (decision === "approved") {
    return (
      <Card className="max-w-lg w-full mx-auto mb-4 overflow-hidden">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#189370] shrink-0">
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Reply sent</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Email {emailId} marked as replied.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (decision === "rejected") {
    return (
      <Card className="max-w-lg w-full mx-auto mb-4 overflow-hidden">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[var(--secondary)] shrink-0">
            <X className="h-4 w-4 text-[var(--muted-foreground)]" />
          </div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Draft rejected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg w-full mx-auto mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
          <CardTitle className="text-base">Review reply before sending</CardTitle>
        </div>
        <CardDescription>Subject: {subject}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === "inProgress" ? (
          <div className="h-24 rounded-md bg-[var(--secondary)] animate-pulse" />
        ) : (
          <>
            <textarea
              value={draft}
              onChange={(e) => {
                userEditedRef.current = true;
                setDraft(e.target.value);
              }}
              disabled={status !== "executing"}
              rows={6}
              aria-label="Reply body"
              className="w-full text-sm rounded-[var(--radius)] border border-[var(--border)] bg-transparent p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] resize-y text-[var(--foreground)]"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={status !== "executing"}
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button size="sm" disabled={status !== "executing"} onClick={handleApprove}>
                Approve & Send
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
