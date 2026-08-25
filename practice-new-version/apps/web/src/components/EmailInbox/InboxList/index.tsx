import { Filter, Mail, MailOpen, MoreVertical, RefreshCw } from "lucide-react";
import type { Email } from "@/types";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components";
import {
  COURSE_LABEL,
  FALLBACK_TONE,
  STATUS_TONE,
  TOPIC_LABEL,
  TOPIC_TONE,
  URGENCY_TONE,
  URGENCY_VARIANT,
} from "@/constants";
import { cn, formatReceivedAt, formatReceivedAtFull } from "@/utils";

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

const InboxSkeleton = () => {
  return (
    <div aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 border-b border-border animate-pulse"
          style={{ opacity: 1 - i * 0.14 }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="h-3 w-28 rounded bg-secondary" />
            <div className="h-2.5 w-10 rounded bg-secondary" />
          </div>
          <div className="h-3 w-52 rounded bg-secondary mt-2" />
          <div className="h-2.5 w-full rounded bg-secondary mt-2" />
        </div>
      ))}
    </div>
  );
};

export const InboxList = ({
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
}: InboxListProps) => {
  const hasUnread = emails.some((e) => e.status === "unread");
  const hasRead = emails.some((e) => e.status === "read");

  return (
    <div>
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground">
            Inbox{" "}
            <span className="text-muted-foreground font-normal">
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
                isFiltered ? "text-primary" : "text-muted-foreground",
              )}
              onClick={onOpenFilters}
              disabled={isLoading}
              title="Filter inbox"
              aria-label="Filter inbox"
            >
              <Filter className="h-3.5 w-3.5" />
              {isFiltered && (
                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  disabled={isLoading}
                  title="List actions"
                  aria-label="List actions"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={!hasUnread}
                  onSelect={onMarkAllRead}
                >
                  <MailOpen className="h-3.5 w-3.5" />
                  Mark all as read
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!hasRead}
                  onSelect={onMarkAllUnread}
                >
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
              className="h-7 w-7 -mr-1 text-muted-foreground"
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
        <div className="p-6 text-sm text-muted-foreground text-center">
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
            : FALLBACK_TONE;

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
                  ? "mx-2 my-1 rounded-xl border border-border bg-card shadow-[inset_3px_0_0_0_var(--tone)]"
                  : "border-b border-border hover:bg-secondary/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-sm truncate",
                    isUnread
                      ? "font-bold text-foreground"
                      : "font-medium text-muted-foreground",
                  )}
                >
                  {email.from.name}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {isUnread && (
                    <span className="h-2 w-2 rounded-full bg-(--tone)" />
                  )}
                  <time
                    dateTime={email.receivedAt}
                    title={formatReceivedAtFull(email.receivedAt)}
                    suppressHydrationWarning
                    className={cn(
                      "text-[11px] tabular-nums",
                      isUnread
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground",
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
                        className="h-5 w-5 -my-1 flex items-center justify-center rounded hover:bg-secondary text-muted-foreground cursor-pointer"
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
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {email.subject}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">
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
                    <Badge
                      variant="tone"
                      className={cn("text-[11px]", STATUS_TONE.replied)}
                    >
                      Replied
                    </Badge>
                  )}
                  {email.status === "flagged_for_followup" && (
                    <Badge
                      variant="tone"
                      className={cn(
                        "text-[11px]",
                        STATUS_TONE.flagged_for_followup,
                      )}
                    >
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
};
