"use client";

import type { Email, EmailCategory, Urgency } from "@/types/email";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<EmailCategory, string> = {
  question: "Question",
  bug: "Bug",
  billing: "Billing",
  feature: "Feature",
  complex: "Complex",
};

const URGENCY_VARIANT: Record<Urgency, "default" | "secondary" | "outline"> = {
  high: "default",
  medium: "secondary",
  low: "outline",
};

interface InboxListProps {
  emails: Email[];
  selectedId: string | null;
  onSelect: (email: Email) => void;
}

export function InboxList({ emails, selectedId, onSelect }: InboxListProps) {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-[var(--card)] border-b border-[var(--border)] px-4 py-3">
        <h2 className="text-sm font-bold text-[var(--foreground)]">
          Inbox{" "}
          <span className="text-[var(--muted-foreground)] font-normal">
            ({emails.length})
          </span>
        </h2>
      </div>

      {emails.length === 0 ? (
        <div className="p-6 text-sm text-[var(--muted-foreground)] text-center">
          No emails
        </div>
      ) : (
        emails.map((email) => {
          const isUnread = email.status === "unread";
          const isSelected = email.id === selectedId;
          return (
            <button
              key={email.id}
              onClick={() => onSelect(email)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-[var(--border)] transition-colors cursor-pointer",
                isSelected ? "bg-[var(--secondary)]" : "hover:bg-[var(--secondary)]/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-sm truncate",
                    isUnread
                      ? "font-bold text-[var(--foreground)]"
                      : "font-medium text-[var(--muted-foreground)]",
                  )}
                >
                  {email.from.name}
                </span>
                {isUnread && (
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)] shrink-0" />
                )}
              </div>
              <div
                className={cn(
                  "text-sm truncate mt-0.5",
                  isUnread
                    ? "font-semibold text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)]",
                )}
              >
                {email.subject}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] truncate mt-1">
                {email.body}
              </p>
              {(email.classification || email.status !== "unread") && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {email.classification && (
                    <>
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORY_LABEL[email.classification.category]}
                      </Badge>
                      <Badge
                        variant={URGENCY_VARIANT[email.classification.urgency]}
                        className="text-[10px]"
                      >
                        {email.classification.urgency}
                      </Badge>
                    </>
                  )}
                  {email.status === "replied" && (
                    <Badge variant="secondary" className="text-[10px]">
                      Replied
                    </Badge>
                  )}
                  {email.status === "bug_filed" && (
                    <Badge variant="secondary" className="text-[10px]">
                      Bug filed
                    </Badge>
                  )}
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
