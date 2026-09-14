import { Loader2, Mail, MailOpen, MoreVertical, RefreshCw } from "lucide-react";
import type { Email } from "@/types";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  TryAgainButton,
} from "@/components";
import { useLoadMoreSentinel } from "@/hooks";
import { InboxListItem } from "./InboxListItem";
import { InboxSkeleton } from "./InboxSkeleton";
import { cn } from "@/utils";

interface InboxListProps {
  emails: Email[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  isFiltered: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onMarkAllRead: () => void;
  onMarkAllUnread: () => void;
  onSelect: (email: Email) => void;
  onToggleRead: (email: Email) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  isLoadMoreError: boolean;
}

// The list's own header — "Inbox (N)" plus refresh and the mark-all actions behind a menu —
// sticks with these rows, not the search/filter InboxToolbar above (that one sits outside
// this card entirely).
export const InboxList = ({
  emails,
  totalCount,
  isLoading,
  isError,
  isFiltered,
  isRefreshing,
  onRefresh,
  onMarkAllRead,
  onMarkAllUnread,
  onSelect,
  onToggleRead,
  hasMore,
  isLoadingMore,
  onLoadMore,
  isLoadMoreError,
}: InboxListProps) => {
  const hasUnread = emails.some((e) => e.status === "unread");
  const hasRead = emails.some((e) => e.status === "read");
  const sentinelRef = useLoadMoreSentinel(hasMore, onLoadMore);

  return (
    <div>
      <div className="sticky top-0 z-10 flex h-10 items-center justify-between gap-2 border-b border-border bg-card px-4">
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
      ) : isError && emails.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <p className="text-sm text-destructive">
            Couldn&apos;t load the inbox.
          </p>
          <TryAgainButton onClick={onRefresh} />
        </div>
      ) : emails.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground text-center">
          No emails
        </div>
      ) : (
        emails.map((email) => (
          <InboxListItem
            key={email.id}
            email={email}
            onSelect={onSelect}
            onToggleRead={onToggleRead}
          />
        ))
      )}
      {!isLoading && emails.length > 0 && hasMore && (
        <div
          ref={sentinelRef}
          className="pt-3 pb-5 flex flex-col items-center justify-center gap-2"
        >
          {isLoadMoreError ? (
            <>
              <span className="text-xs text-destructive">
                Couldn&apos;t load more emails.
              </span>
              <TryAgainButton onClick={onLoadMore} size="xs" />
            </>
          ) : (
            isLoadingMore && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading more…
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
};
