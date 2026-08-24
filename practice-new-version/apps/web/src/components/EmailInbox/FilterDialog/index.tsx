import { useState } from "react";
import type {
  Course,
  EmailStatus,
  EmailTopic,
  Urgency,
  WorkType,
} from "@/types/email";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Select,
} from "@/components/common";
import {
  COURSE_LABEL,
  STATUS_LABEL,
  TOPIC_LABEL,
  URGENCY_LABEL,
  WORK_TYPE_LABEL,
} from "@/constants";
import { EMPTY_FILTERS, type EmailFilters } from "@/lib/emailFilters";

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: EmailFilters;
  onApply: (filters: EmailFilters) => void;
}

export const FilterDialog = ({
  open,
  onOpenChange,
  filters,
  onApply,
}: FilterDialogProps) => {
  // Draft state so Cancel/closing without Apply doesn't touch the active filters.
  const [draft, setDraft] = useState<EmailFilters>(filters);

  // Reset the draft on each open, adjusted during render rather than in an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(filters);
  }

  const set = <K extends keyof EmailFilters>(key: K, value: EmailFilters[K]) =>
    setDraft((d) => ({ ...d, [key]: value || undefined }));

  const apply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  const reset = () => {
    setDraft(EMPTY_FILTERS);
    onApply(EMPTY_FILTERS);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter inbox</DialogTitle>
        </DialogHeader>

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
