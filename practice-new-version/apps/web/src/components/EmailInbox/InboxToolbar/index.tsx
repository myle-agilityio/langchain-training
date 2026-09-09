import { Filter, RefreshCw, Search } from "lucide-react";
import { Button, Input } from "@/components";
import { cn } from "@/utils";

interface InboxToolbarProps {
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  isFiltered: boolean;
  onOpenFilters: () => void;
  search: string;
  onSearchChange: (value: string) => void;
}

// Sits above the list's own card (and above the reading pane's "Back to inbox" bar) rather
// than inside either, so it's never wrapped in its own box — just search, filter and refresh.
// The "Inbox (N)" title and the mark-all actions are the list's own header, not this row's.
export const InboxToolbar = ({
  isLoading,
  isRefreshing,
  onRefresh,
  isFiltered,
  onOpenFilters,
  search,
  onSearchChange,
}: InboxToolbarProps) => (
  <div className="shrink-0 flex items-center gap-2 px-4 pt-3 pb-2">
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search emails"
        aria-label="Search emails"
        className="h-8 pl-8 text-sm"
      />
    </div>
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-7 w-7 relative shrink-0",
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
