import {
  Flag,
  Loader2,
  Mail,
  MailOpen,
  MoreVertical,
  RefreshCw,
} from "lucide-react";
import type { Email } from "@/types";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components";
import { useLoadMoreSentinel } from "@/hooks";
import { InboxSkeleton } from "./InboxSkeleton";
import {
  COURSE_LABEL,
  FALLBACK_TONE,
  TONE,
  TOPIC_LABEL,
  TOPIC_TONE,
  URGENCY_LABEL,
  URGENCY_TONE,
  WORK_TYPE_LABEL,
} from "@/constants";
import { cn, formatReceivedAt, formatReceivedAtFull } from "@/utils";

// Same sender always lands on the same hue — not meaningful the way urgency's tone is, just a
// stable way to tell senders apart at a glance.
const AVATAR_TONES = Object.values(TONE);

const pickAvatarTone = (seed: string): string => {
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }

  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
};

interface InboxListProps {
  emails: Email[];
  totalCount: number;
  isLoading: boolean;
  isFiltered: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  onMarkAllUnread: () => void;
  selectedId: string | null;
  onSelect: (email: Email) => void;
  onToggleRead: (email: Email) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

// The list's own header — "Inbox (N)" plus refresh and the mark-all actions behind a menu —
// sticks with these rows, not the search/filter InboxToolbar above (that one sits outside
// this card entirely).
export const InboxList = ({
  emails,
  totalCount,
  isLoading,
  isFiltered,
  isRefreshing,
  onRefresh,
  onMarkAllRead,
  onMarkAllUnread,
  selectedId,
  onSelect,
  onToggleRead,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: InboxListProps) => {
  const hasUnread = emails.some((e) => e.status === "unread");
  const hasRead = emails.some((e) => e.status === "read");
  const sentinelRef = useLoadMoreSentinel(hasMore, onLoadMore);

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-1.5">
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
          {/* The list is a snapshot: it refetches on mount and when a chat run finishes, but
              nothing else pushes changes. This is the manual way to pull those in. */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onRefresh}
            disabled={isLoading || isRefreshing}
            title="Refresh inbox"
            aria-label="Refresh inbox"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
            />
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
                "group flex w-full items-center px-4 py-3 text-left transition-colors cursor-pointer",
                railTone,
                isSelected
                  ? "border-b border-border bg-card shadow-[inset_3px_0_0_0_var(--tone)]"
                  : "border-b border-border hover:bg-secondary/50",
              )}
            >
              {/* Same sender always gets the same hue (pickAvatarTone), scoped to this element
                  so it doesn't fight the row's own --tone (urgency, for the accent bar/dot). */}
              <div
                className={cn(
                  "mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--tone)/15 text-sm font-semibold text-(color:--tone)",
                  pickAvatarTone(email.from.name),
                )}
              >
                {email.from.name.charAt(0).toUpperCase()}
              </div>

              <span
                className={cn(
                  "mr-8 w-24 shrink-0 truncate text-sm",
                  isUnread
                    ? "font-bold text-foreground"
                    : "font-medium text-muted-foreground",
                )}
              >
                {email.from.name}
              </span>

              {email.classification && (
                <div className="mr-2 flex shrink-0 items-center gap-1">
                  <Badge
                    variant="tone"
                    className={cn(
                      "text-[10px]",
                      TOPIC_TONE[email.classification.topic],
                    )}
                  >
                    {TOPIC_LABEL[email.classification.topic]}
                  </Badge>
                  {email.classification.workType !== "none" && (
                    <Badge variant="secondary" className="text-[10px]">
                      {WORK_TYPE_LABEL[email.classification.workType]}
                    </Badge>
                  )}
                  {email.classification.course !== "none" && (
                    <Badge variant="secondary" className="text-[10px]">
                      {COURSE_LABEL[email.classification.course]}
                    </Badge>
                  )}
                </div>
              )}

              <div className="mr-2 flex min-w-0 flex-1 items-center gap-2 text-sm">
                <span
                  className={cn(
                    "min-w-0 max-w-[50%] shrink truncate",
                    isUnread ? "font-bold text-foreground" : "text-foreground",
                  )}
                >
                  {email.subject}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {email.body}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {email.classification && (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-(color:--tone)">
                    <Flag className="h-3 w-3" />
                    {/* Below this width the row is already tight — keep the flag, drop the
                        label rather than let it get truncated too. */}
                    <span className="hidden @min-[560px]:inline">
                      {URGENCY_LABEL[email.classification.urgency]}
                    </span>
                  </span>
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
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-secondary cursor-pointer"
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
          );
        })
      )}
      {!isLoading && emails.length > 0 && hasMore && (
        <div
          ref={sentinelRef}
          className="pt-3 pb-5 flex items-center justify-center"
        >
          {isLoadingMore && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading more…
            </span>
          )}
        </div>
      )}
    </div>
  );
};
