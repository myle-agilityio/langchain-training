import { RefreshCw } from "lucide-react";
import { Button } from "@/components";
import type { EmailFilters } from "@/utils";
import { cn } from "@/utils";
import { InboxSearchBar } from "../InboxSearchBar";

interface InboxToolbarProps {
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  filters: EmailFilters;
  onApplyFilters: (filters: EmailFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

// Sits above the list's own card (and above the reading pane's "Back to inbox" bar) rather
// than inside either, so it's never wrapped in its own box — just search+filter and refresh.
// The "Inbox (N)" title and the mark-all actions are the list's own header, not this row's.
export const InboxToolbar = ({
  isLoading,
  isRefreshing,
  onRefresh,
  filters,
  onApplyFilters,
  search,
  onSearchChange,
}: InboxToolbarProps) => (
  <div className="shrink-0 flex items-center gap-2 px-4 pt-3 pb-2">
    <InboxSearchBar
      search={search}
      onSearchChange={onSearchChange}
      filters={filters}
      onApplyFilters={onApplyFilters}
      disabled={isLoading}
    />
    {/* The list is a snapshot: it refetches on mount and when a chat run finishes, but
        nothing else pushes changes. This is the manual way to pull those in. */}
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 text-muted-foreground"
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
);
