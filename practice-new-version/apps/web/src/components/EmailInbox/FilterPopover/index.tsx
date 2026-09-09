import { useState } from "react";
import { Filter } from "lucide-react";
import type {
  Course,
  EmailStatus,
  EmailTopic,
  Urgency,
  WorkType,
} from "@/types";
import {
  Button,
  Field,
  Input,
  Popover,
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
import { cn, EMPTY_FILTERS, type EmailFilters } from "@/utils";

interface FilterPopoverProps {
  filters: EmailFilters;
  onApply: (filters: EmailFilters) => void;
  isFiltered: boolean;
  disabled?: boolean;
}

// Gmail-style: the trigger is the toolbar's own filter icon, not a separate button elsewhere —
// so this owns both, anchoring the form to wherever it's rendered instead of a modal dialog.
export const FilterPopover = ({
  filters,
  onApply,
  isFiltered,
  disabled,
}: FilterPopoverProps) => {
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

  const set = <K extends keyof EmailFilters>(key: K, value: EmailFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: value || undefined }));

  const apply = () => {
    onApply(draft);
    setOpen(false);
  };

  const reset = () => {
    setDraft(EMPTY_FILTERS);
    onApply(EMPTY_FILTERS);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 relative shrink-0",
            isFiltered ? "text-primary" : "text-muted-foreground",
          )}
          disabled={disabled}
          title="Filter inbox"
          aria-label="Filter inbox"
        >
          <Filter className="h-3.5 w-3.5" />
          {isFiltered && (
            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-96 overflow-y-auto">
        <p className="mb-4 text-sm font-bold text-foreground">Filter inbox</p>

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
          <Button variant="ghost" size="sm" onClick={reset}>
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
