"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Email } from "../../types/types";

interface EmailListProps {
  emails: Email[];
  selectedId: string | null;
  onSelect: (email: Email) => void;
}

const urgencyDot: Record<string, string> = {
  low: "bg-[var(--muted-foreground)]",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const statusLabel: Record<Email["status"], string> = {
  unread: "Unread",
  read: "Read",
  replied: "Replied",
  bug_filed: "Bug filed",
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function EmailList({ emails, selectedId, onSelect }: EmailListProps) {
  const sorted = [...emails].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );
  const unreadCount = emails.filter((e) => e.status === "unread").length;

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 px-4 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="text-sm font-bold tracking-tight text-[var(--foreground)]">Inbox</h2>
        {unreadCount > 0 && <Badge variant="secondary">{unreadCount} unread</Badge>}
      </div>

      {sorted.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-[var(--muted-foreground)] p-6 text-center">
          No emails yet
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {sorted.map((email) => (
            <li key={email.id}>
              <button
                onClick={() => onSelect(email)}
                aria-label={`Open email from ${email.fromName}: ${email.subject}`}
                className={cn(
                  "w-full text-left px-4 py-3 transition-colors hover:bg-[var(--secondary)] cursor-pointer",
                  selectedId === email.id && "bg-[var(--secondary)]",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {email.status === "unread" && (
                    <span className="h-2 w-2 rounded-full bg-[var(--primary)] shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-sm truncate flex-1",
                      email.status === "unread"
                        ? "font-semibold text-[var(--foreground)]"
                        : "font-medium text-[var(--muted-foreground)]",
                    )}
                  >
                    {email.fromName}
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                    {timeAgo(email.receivedAt)}
                  </span>
                </div>
                <div
                  className={cn(
                    "text-sm truncate mb-1",
                    email.status === "unread"
                      ? "font-semibold text-[var(--foreground)]"
                      : "text-[var(--foreground)]",
                  )}
                >
                  {email.subject}
                </div>
                <div className="flex items-center gap-1.5">
                  {email.classification && (
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full shrink-0",
                        urgencyDot[email.classification.urgency],
                      )}
                    />
                  )}
                  <span className="text-xs text-[var(--muted-foreground)] truncate">
                    {statusLabel[email.status]}
                    {email.classification ? ` · ${email.classification.intent}` : ""}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
