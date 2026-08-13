import { Filter, Mail, MailOpen, MoreVertical, RefreshCw } from "lucide-react";
import type { Course, Email, EmailTopic, Urgency, WorkType } from "@/types/email";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatReceivedAt, formatReceivedAtFull } from "@/lib/format-date";

export const TOPIC_LABEL: Record<EmailTopic, string> = {
  question: "Question",
  submission: "Submission",
  review_request: "Review",
  grade_dispute: "Grade dispute",
  absence: "Absence",
  scheduling: "Scheduling",
  admin: "Admin",
  complex: "Complex",
};

// Six tones for eight topics, so two pairs share one — the reuses are paired so the two never
// plausibly apply to the same email, and the label disambiguates either way.
export const TOPIC_TONE: Record<EmailTopic, string> = {
  question: "tone-blue",
  submission: "tone-green",
  review_request: "tone-teal",
  grade_dispute: "tone-red",
  absence: "tone-amber",
  scheduling: "tone-violet",
  admin: "tone-blue",
  complex: "tone-violet",
};

// Course and workType stay colourless (outline badges): they're filter facets, not triage
// signals, and hues would put four competing colours in one row and drown the urgency cue.
export const COURSE_LABEL: Record<Course, string> = {
  math_11: "Grade 11",
  math_12: "Grade 12",
  none: "",
};

export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  practice: "Practice",
  exercise: "Exercise",
  homework: "Homework",
  quiz: "Quiz",
  test: "Test",
  project: "Project",
  none: "",
};

// Urgency shares hues with topics, so it's separated by treatment instead: only `high` gets
// the solid fill, keeping at most one loud badge per row.
export const URGENCY_TONE: Record<Urgency, string> = {
  high: "tone-red",
  medium: "tone-amber",
  low: "tone-teal",
};

const URGENCY_VARIANT: Record<Urgency, "tone" | "toneSolid"> = {
  high: "toneSolid",
  medium: "tone",
  low: "tone",
};

interface InboxListProps {
  emails: Email[];
  totalCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  selectedId: string | null;
  onSelect: (email: Email) => void;
  onToggleRead: (email: Email) => void;
  onMarkAllRead: () => void;
  onMarkAllUnread: () => void;
  isFiltered: boolean;
  onOpenFilters: () => void;
}

function InboxSkeleton() {
  return (
    <div aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 border-b border-[var(--border)] animate-pulse"
          style={{ opacity: 1 - i * 0.14 }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="h-3 w-28 rounded bg-[var(--secondary)]" />
            <div className="h-2.5 w-10 rounded bg-[var(--secondary)]" />
          </div>
          <div className="h-3 w-52 rounded bg-[var(--secondary)] mt-2" />
          <div className="h-2.5 w-full rounded bg-[var(--secondary)] mt-2" />
        </div>
      ))}
    </div>
  );
}

export function InboxList({
  emails,
  totalCount,
  isLoading,
  isRefreshing,
  onRefresh,
  selectedId,
  onSelect,
  onToggleRead,
  onMarkAllRead,
  onMarkAllUnread,
  isFiltered,
  onOpenFilters,
}: InboxListProps) {
  const hasUnread = emails.some((e) => e.status === "unread");
  const hasRead = emails.some((e) => e.status === "read");

  return (
    <div>
      <div className="sticky top-0 z-10 bg-[var(--card)] border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--foreground)]">
            Inbox{" "}
            <span className="text-[var(--muted-foreground)] font-normal">
              {/* A count of 0 while loading reads as "empty inbox", a different claim
                  than "not known yet". */}
              {isLoading
                ? "…"
                : isFiltered
                  ? `(${emails.length} of ${totalCount})`
                  : `(${emails.length})`}
            </span>
          </h2>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 relative",
                isFiltered ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]",
              )}
              onClick={onOpenFilters}
              disabled={isLoading}
              title="Filter inbox"
              aria-label="Filter inbox"
            >
              <Filter className="h-3.5 w-3.5" />
              {isFiltered && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[var(--muted-foreground)]"
                  disabled={isLoading}
                  title="List actions"
                  aria-label="List actions"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={!hasUnread} onSelect={onMarkAllRead}>
                  <MailOpen className="h-3.5 w-3.5" />
                  Mark all as read
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!hasRead} onSelect={onMarkAllUnread}>
                  <Mail className="h-3.5 w-3.5" />
                  Mark all as unread
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* The list is a snapshot: it refetches on mount and when a chat run finishes, but
                nothing else pushes changes. This is the manual way to pull those in. */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 -mr-1 text-[var(--muted-foreground)]"
              onClick={onRefresh}
              disabled={isLoading || isRefreshing}
              title="Refresh inbox"
              aria-label="Refresh inbox"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
              />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <InboxSkeleton />
      ) : emails.length === 0 ? (
        <div className="p-6 text-sm text-[var(--muted-foreground)] text-center">
          No emails
        </div>
      ) : (
        emails.map((email) => {
          const isUnread = email.status === "unread";
          const isSelected = email.id === selectedId;
          // Rail hue tracks urgency once classified; before that it falls back to the brand
          // lilac so selection is still visible on an untriaged inbox.
          const railTone = email.classification
            ? URGENCY_TONE[email.classification.urgency]
            : "tone-violet";
          return (
            <div
              key={email.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(email)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(email);
                }
              }}
              className={cn(
                "group w-full text-left px-4 py-3.5 transition-colors cursor-pointer",
                railTone,
                isSelected
                  ? "row-accent mx-2 my-1 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] shadow-sm"
                  : "border-b border-[var(--border)] hover:bg-[var(--secondary)]/50",
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
                <div className="flex items-center gap-1 shrink-0">
                  {isUnread && (
                    <span className="h-2 w-2 rounded-full bg-[var(--tone)]" />
                  )}
                  <time
                    dateTime={email.receivedAt}
                    title={formatReceivedAtFull(email.receivedAt)}
                    suppressHydrationWarning
                    className={cn(
                      "text-[11px] tabular-nums",
                      isUnread
                        ? "font-semibold text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)]",
                    )}
                  >
                    {formatReceivedAt(email.receivedAt)}
                  </time>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        title="Email actions"
                        aria-label="Email actions"
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 data-[state=open]:opacity-100 h-5 w-5 -my-1 flex items-center justify-center rounded hover:bg-[var(--secondary)] text-[var(--muted-foreground)] transition-opacity cursor-pointer"
                      >
                        <MoreVertical className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        disabled={!isUnread}
                        onSelect={() => onToggleRead(email)}
                      >
                        <MailOpen className="h-3.5 w-3.5" />
                        Mark as read
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={isUnread || email.status === "replied"}
                        onSelect={() => onToggleRead(email)}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Mark as unread
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
                <div className="flex gap-2 mt-2.5 flex-wrap">
                  {email.classification && (
                    <>
                      <Badge
                        variant="tone"
                        className={cn(
                          "text-[11px]",
                          TOPIC_TONE[email.classification.topic],
                        )}
                      >
                        {TOPIC_LABEL[email.classification.topic]}
                      </Badge>
                      {email.classification.course !== "none" && (
                        <Badge variant="outline" className="text-[11px]">
                          {COURSE_LABEL[email.classification.course]}
                        </Badge>
                      )}
                      <Badge
                        variant={URGENCY_VARIANT[email.classification.urgency]}
                        className={cn(
                          "text-[11px]",
                          URGENCY_TONE[email.classification.urgency],
                        )}
                      >
                        {email.classification.urgency}
                      </Badge>
                    </>
                  )}
                  {email.status === "replied" && (
                    <Badge variant="tone" className="text-[11px] tone-green">
                      Replied
                    </Badge>
                  )}
                  {email.status === "flagged_for_followup" && (
                    <Badge variant="tone" className="text-[11px] tone-amber">
                      Follow up
                    </Badge>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
