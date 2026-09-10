import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type {
  Course,
  EmailStatus,
  EmailTopic,
  Urgency,
  WorkType,
} from "@/types";
import {
  Badge,
  Button,
  Field,
  Input,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
  Select,
} from "@/components/common";
import {
  COURSE_LABEL,
  STATUS_LABEL,
  TOPIC_LABEL,
  URGENCY_LABEL,
  WORK_TYPE_LABEL,
} from "@/constants";
import { cn, describeFilters, type EmailFilters } from "@/utils";

interface InboxSearchBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filters: EmailFilters;
  onApplyFilters: (filters: EmailFilters) => void;
  disabled?: boolean;
}

// Gmail-style: the sliders trigger is anchored to the whole bar (PopoverAnchor), not just the
// icon, so the dropdown spans the bar's full width instead of hanging off one corner. Applied
// filters come back as pills inline with the typed text rather than a separate indicator.
export const InboxSearchBar = ({
  search,
  onSearchChange,
  filters,
  onApplyFilters,
  disabled,
}: InboxSearchBarProps) => {
  const [open, setOpen] = useState(false);
  // Draft state so closing without Apply doesn't touch the active filters.
  const [draft, setDraft] = useState<EmailFilters>(filters);

  // Reset the draft on each open, adjusted during render rather than in an effect.
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setDraft(filters);
    }
  }

  const pills = describeFilters(filters);
  const hasStructuredFilters = pills.length > 0;

  const set = <K extends keyof EmailFilters>(key: K, value: EmailFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: value || undefined }));

  const apply = () => {
    onApplyFilters(draft);
    setOpen(false);
  };

  // Keeps the typed free-text search — only the structured (pill) fields get cleared.
  const clearStructuredFilters = () => {
    const cleared: EmailFilters = { search: filters.search };

    setDraft(cleared);
    onApplyFilters(cleared);
  };

  const clearField = (key: keyof EmailFilters) => {
    const next: EmailFilters = { ...filters, [key]: undefined };

    setDraft(next);
    onApplyFilters(next);
  };

  const clearAndClose = () => {
    clearStructuredFilters();
    setOpen(false);
  };

  // The bar's own clear button wipes the typed text too — unlike clearStructuredFilters,
  // which the filter panel's own "Clear filters" uses and deliberately leaves search alone.
  const clearAll = () => {
    onSearchChange("");
    setDraft({});
    onApplyFilters({});
  };

  const hasSearchText = search.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="flex min-h-8 min-w-0 flex-1 flex-wrap items-center gap-1 rounded-xl border border-input bg-card px-2 py-1 shadow-sm focus-within:ring-2 focus-within:ring-ring">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {pills.map((pill) => (
            <Badge
              key={pill.key}
              variant="secondary"
              className="shrink-0 gap-1 pr-1"
            >
              {pill.text}
              <button
                type="button"
                onClick={() => clearField(pill.key)}
                disabled={disabled}
                title={`Remove ${pill.text} filter`}
                aria-label={`Remove ${pill.text} filter`}
                className="rounded-full hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={pills.length ? "" : "Search emails"}
            aria-label="Search emails"
            disabled={disabled}
            className="min-w-20 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
          {(hasStructuredFilters || hasSearchText) && (
            <button
              type="button"
              onClick={clearAll}
              disabled={disabled}
              title="Clear search and filters"
              aria-label="Clear search and filters"
              className="shrink-0 text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              title="Filter inbox"
              aria-label="Filter inbox"
              className={cn(
                "shrink-0 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
                hasStructuredFilters ? "text-primary" : "text-muted-foreground",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        className="max-h-[70vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select
                value={draft.status ?? ""}
                onChange={(e) =>
                  set("status", (e.target.value || undefined) as EmailStatus)
                }
              >
                <option value="">Any</option>
                {(Object.keys(STATUS_LABEL) as EmailStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Urgency">
              <Select
                value={draft.urgency ?? ""}
                onChange={(e) =>
                  set("urgency", (e.target.value || undefined) as Urgency)
                }
              >
                <option value="">Any</option>
                {(Object.keys(URGENCY_LABEL) as Urgency[]).map((u) => (
                  <option key={u} value={u}>
                    {URGENCY_LABEL[u]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Grade">
              <Select
                value={draft.course ?? ""}
                onChange={(e) =>
                  set("course", (e.target.value || undefined) as Course)
                }
              >
                <option value="">Any</option>
                <option value="math_11">{COURSE_LABEL.math_11}</option>
                <option value="math_12">{COURSE_LABEL.math_12}</option>
              </Select>
            </Field>
            <Field label="Type">
              <Select
                value={draft.topic ?? ""}
                onChange={(e) =>
                  set("topic", (e.target.value || undefined) as EmailTopic)
                }
              >
                <option value="">Any</option>
                {(Object.keys(TOPIC_LABEL) as EmailTopic[]).map((t) => (
                  <option key={t} value={t}>
                    {TOPIC_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Work type">
            <Select
              value={draft.workType ?? ""}
              onChange={(e) =>
                set("workType", (e.target.value || undefined) as WorkType)
              }
            >
              <option value="">Any</option>
              {(Object.keys(WORK_TYPE_LABEL) as WorkType[])
                .filter((w) => w !== "none")
                .map((w) => (
                  <option key={w} value={w}>
                    {WORK_TYPE_LABEL[w]}
                  </option>
                ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <Input
                value={draft.from ?? ""}
                onChange={(e) => set("from", e.target.value)}
                placeholder="Name or email"
              />
            </Field>
            <Field label="Subject contains">
              <Input
                value={draft.subject ?? ""}
                onChange={(e) => set("subject", e.target.value)}
                placeholder="Subject text"
              />
            </Field>
          </div>

          <Field label="Has the words">
            <Input
              value={draft.hasWords ?? ""}
              onChange={(e) => set("hasWords", e.target.value)}
              placeholder="Search the email body"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Received after">
              <Input
                type="date"
                value={draft.receivedAfter ?? ""}
                onChange={(e) => set("receivedAfter", e.target.value)}
              />
            </Field>
            <Field label="Received before">
              <Input
                type="date"
                value={draft.receivedBefore ?? ""}
                onChange={(e) => set("receivedBefore", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-between mt-5">
          <Button variant="ghost" size="sm" onClick={clearAndClose}>
            Clear filters
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
