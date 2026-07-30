"use client";

import { useEffect, useState } from "react";
import type { Course, EmailStatus, EmailTopic, Urgency, WorkType } from "@/types/email";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { COURSE_LABEL, TOPIC_LABEL, WORK_TYPE_LABEL } from "./inbox-list";
import { EMPTY_FILTERS, type EmailFilters } from "@/lib/email-filters";

const URGENCY_LABEL: Record<Urgency, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const STATUS_LABEL: Record<EmailStatus, string> = {
  unread: "Unread",
  read: "Read",
  replied: "Replied",
  flagged_for_followup: "Follow up",
};

// Native <select>/<option> popups need an explicit, opaque background + text color — they don't
// reliably inherit CSS custom properties the way the closed control does, so "bg-transparent"
// left the dropdown list's background at the browser default (often white) while the text still
// inherited --foreground (white in dark mode): white-on-white, invisible. color-scheme tells the
// browser which native palette to fall back to for whatever our CSS doesn't reach.
const selectClassName =
  "flex h-9 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--background)] " +
  "text-[var(--foreground)] px-3 text-sm shadow-sm transition-colors focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-[var(--ring)] [color-scheme:light_dark]";
const optionClassName = "bg-[var(--background)] text-[var(--foreground)]";

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: EmailFilters;
  onApply: (filters: EmailFilters) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

export function FilterDialog({ open, onOpenChange, filters, onApply }: FilterDialogProps) {
  // Draft state so Cancel/closing without Apply doesn't touch the active filters.
  const [draft, setDraft] = useState<EmailFilters>(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

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

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Status">
              <select
                value={draft.status ?? ""}
                onChange={(e) => set("status", (e.target.value || undefined) as EmailStatus)}
                className={selectClassName}
              >
                <option value="" className={optionClassName}>
                  Any
                </option>
                {(Object.keys(STATUS_LABEL) as EmailStatus[]).map((s) => (
                  <option key={s} value={s} className={optionClassName}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Urgency">
              <select
                value={draft.urgency ?? ""}
                onChange={(e) => set("urgency", (e.target.value || undefined) as Urgency)}
                className={selectClassName}
              >
                <option value="" className={optionClassName}>
                  Any
                </option>
                {(Object.keys(URGENCY_LABEL) as Urgency[]).map((u) => (
                  <option key={u} value={u} className={optionClassName}>
                    {URGENCY_LABEL[u]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Grade">
              <select
                value={draft.course ?? ""}
                onChange={(e) => set("course", (e.target.value || undefined) as Course)}
                className={selectClassName}
              >
                <option value="" className={optionClassName}>
                  Any
                </option>
                <option value="math_11" className={optionClassName}>
                  {COURSE_LABEL.math_11}
                </option>
                <option value="math_12" className={optionClassName}>
                  {COURSE_LABEL.math_12}
                </option>
              </select>
            </Field>
            <Field label="Type">
              <select
                value={draft.topic ?? ""}
                onChange={(e) => set("topic", (e.target.value || undefined) as EmailTopic)}
                className={selectClassName}
              >
                <option value="" className={optionClassName}>
                  Any
                </option>
                {(Object.keys(TOPIC_LABEL) as EmailTopic[]).map((t) => (
                  <option key={t} value={t} className={optionClassName}>
                    {TOPIC_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Work type">
            <select
              value={draft.workType ?? ""}
              onChange={(e) => set("workType", (e.target.value || undefined) as WorkType)}
              className={selectClassName}
            >
              <option value="" className={optionClassName}>
                Any
              </option>
              {(Object.keys(WORK_TYPE_LABEL) as WorkType[])
                .filter((w) => w !== "none")
                .map((w) => (
                  <option key={w} value={w} className={optionClassName}>
                    {WORK_TYPE_LABEL[w]}
                  </option>
                ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
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

          <div className="grid grid-cols-2 gap-2">
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
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
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
}
