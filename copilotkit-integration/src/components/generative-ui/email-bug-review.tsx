"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug, Check, X } from "lucide-react";

export interface BugTicketReviewProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
  emailId?: string;
  title?: string;
  description?: string;
  severity?: "low" | "medium" | "high" | "critical";
  onApprove: (ticketId: string) => void;
}

const severityVariant: Record<string, "default" | "secondary"> = {
  low: "secondary",
  medium: "secondary",
  high: "default",
  critical: "default",
};

export function BugTicketReview({
  status,
  respond,
  emailId = "",
  title = "Untitled bug",
  description = "",
  severity = "medium",
  onApprove,
}: BugTicketReviewProps) {
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const handleApprove = () => {
    const id = `BUG-${Math.floor(1000 + Math.random() * 9000)}`;
    setTicketId(id);
    setDecision("approved");
    onApprove(id);
    respond?.(`The human approved. Bug ticket ${id} was created and linked to email ${emailId}.`);
  };

  const handleReject = () => {
    setDecision("rejected");
    respond?.("The human rejected filing a bug ticket for this email.");
  };

  if (decision === "approved") {
    return (
      <Card className="max-w-lg w-full mx-auto mb-4 overflow-hidden">
        <CardContent className="p-5 flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#189370] shrink-0">
            <Check className="h-4 w-4 text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Bug ticket created</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{ticketId}</p>
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
          <p className="text-sm font-semibold text-[var(--foreground)]">Bug ticket rejected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg w-full mx-auto mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-[var(--muted-foreground)]" />
          <CardTitle className="text-base flex-1">{title}</CardTitle>
          <Badge variant={severityVariant[severity]}>{severity}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {status === "inProgress" ? (
          <div className="h-16 rounded-md bg-[var(--secondary)] animate-pulse" />
        ) : (
          <>
            <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
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
                Approve & Create
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
