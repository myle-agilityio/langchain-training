"use client";

import type { Email, EmailCategory, Urgency } from "@/types/email";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<EmailCategory, string> = {
  question: "Question",
  bug: "Bug",
  billing: "Billing",
  feature: "Feature",
  complex: "Complex",
};

// One hue per category so a triaged inbox is scannable by colour alone.
export const CATEGORY_TONE: Record<EmailCategory, string> = {
  question: "tone-blue",
  bug: "tone-red",
  billing: "tone-amber",
  feature: "tone-violet",
  complex: "tone-teal",
};

// Urgency shares hues with categories, so it's separated by *treatment* instead:
// only `high` gets the solid fill, keeping at most one loud badge per row.
export const URGENCY_TONE: Record<Urgency, string> = {
  high: "tone-red",
  medium: "tone-amber",
  low: "tone-teal",
};

const URGENCY_VARIANT: Record<Urgency, "tone" | "toneSolid"> = {
  high: "toneSolid",
  medium: "tone",
  low: "tone",
};

interface InboxListProps {
  emails: Email[];
  selectedId: string | null;
  onSelect: (email: Email) => void;
}

export function InboxList({ emails, selectedId, onSelect }: InboxListProps) {
  return (
    <div>
      <div className="sticky top-0 z-10 relative bg-[var(--card)] border-b border-[var(--border)] px-4 py-3">
        {/* Brand gradient hairline — the one purely decorative bit of colour here,
            anchoring the panel so the semantic badges below aren't the only hue. */}
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: "var(--cpk-ambient-gradient)" }}
        />
        <h2 className="text-sm font-bold text-[var(--foreground)]">
          Inbox{" "}
          <span className="text-[var(--muted-foreground)] font-normal">
            ({emails.length})
          </span>
        </h2>
      </div>

      {emails.length === 0 ? (
        <div className="p-6 text-sm text-[var(--muted-foreground)] text-center">
          No emails
        </div>
      ) : (
        emails.map((email) => {
          const isUnread = email.status === "unread";
          const isSelected = email.id === selectedId;
          // Rail hue tracks urgency once classified; before that it falls back to
          // the brand lilac so selection is still visible on an untriaged inbox.
          const railTone = email.classification
            ? URGENCY_TONE[email.classification.urgency]
            : "tone-violet";
          return (
            <button
              key={email.id}
              onClick={() => onSelect(email)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-[var(--border)] transition-colors cursor-pointer",
                railTone,
                isSelected
                  ? "row-accent bg-[color-mix(in_srgb,var(--tone)_8%,var(--background))]"
                  : "hover:bg-[var(--secondary)]/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "text-sm truncate",
                    isUnread
                      ? "font-bold text-[var(--foreground)]"
                      : "font-medium text-[var(--muted-foreground)]",
                  )}
                >
                  {email.from.name}
                </span>
                {isUnread && (
                  <span className="h-2 w-2 rounded-full bg-[var(--tone)] shrink-0" />
                )}
              </div>
              <div
                className={cn(
                  "text-sm truncate mt-0.5",
                  isUnread
                    ? "font-semibold text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)]",
                )}
              >
                {email.subject}
              </div>
              <p className="text-xs text-[var(--muted-foreground)] truncate mt-1">
                {email.body}
              </p>
              {(email.classification || email.status !== "unread") && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {email.classification && (
                    <>
                      <Badge
                        variant="tone"
                        className={cn(
                          "text-[10px]",
                          CATEGORY_TONE[email.classification.category],
                        )}
                      >
                        {CATEGORY_LABEL[email.classification.category]}
                      </Badge>
                      <Badge
                        variant={URGENCY_VARIANT[email.classification.urgency]}
                        className={cn(
                          "text-[10px]",
                          URGENCY_TONE[email.classification.urgency],
                        )}
                      >
                        {email.classification.urgency}
                      </Badge>
                    </>
                  )}
                  {email.status === "replied" && (
                    <Badge variant="tone" className="text-[10px] tone-green">
                      Replied
                    </Badge>
                  )}
                  {email.status === "bug_filed" && (
                    <Badge variant="tone" className="text-[10px] tone-red">
                      Bug filed
                    </Badge>
                  )}
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
