import type { EmailFilters } from "@/utils";
import { InboxSearchBar } from "../InboxSearchBar";

interface InboxToolbarProps {
  isLoading: boolean;
  filters: EmailFilters;
  onApplyFilters: (filters: EmailFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

// Sits above the list's own card (and above the reading pane's "Back to inbox" bar) rather
// than inside either, so it's never wrapped in its own box — just the search+filter bar.
// The "Inbox (N)" title, refresh and the mark-all actions are the list's own header, not here.
export const InboxToolbar = ({
  isLoading,
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
  </div>
);
