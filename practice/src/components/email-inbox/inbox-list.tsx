"use client";

import type { Course, Email, EmailTopic, Urgency, WorkType } from "@/types/email";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatReceivedAt, formatReceivedAtFull } from "@/lib/format-date";

export const TOPIC_LABEL: Record<EmailTopic, string> = {
  question: "Question",
  submission: "Submission",
  review_request: "Review",
  grade_dispute: "Grade dispute",
  absence: "Absence",
  scheduling: "Scheduling",
  admin: "Admin",
  complex: "Complex",
};

// Hue per topic so a triaged inbox is scannable by colour alone. There are only
// six tones for eight topics, so two pairs share one — the reuses are paired so
// the two never plausibly apply to the same email (a student's Question vs staff
// Admin mail; Scheduling vs Complex), and the label disambiguates either way.
export const TOPIC_TONE: Record<EmailTopic, string> = {
  question: "tone-blue",
  submission: "tone-green",
  review_request: "tone-teal",
  grade_dispute: "tone-red",
  absence: "tone-amber",
  scheduling: "tone-violet",
  admin: "tone-blue",
  complex: "tone-violet",
};

// Course and workType stay deliberately colourless (outline badges): they're
// filter facets, not triage signals, and giving them hues would put four
// competing colours in one row and drown the urgency cue.
export const COURSE_LABEL: Record<Course, string> = {
  math_11: "Grade 11",
  math_12: "Grade 12",
  none: "",
};

export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  practice: "Practice",
  exercise: "Exercise",
  homework: "Homework",
  quiz: "Quiz",
  test: "Test",
  project: "Project",
  none: "",
};

// Urgency shares hues with topics, so it's separated by *treatment* instead:
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
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (email: Email) => void;
}

/**
 * Placeholder rows shaped like real ones (sender, subject, preview) so the list doesn't jump
 * when the fetch lands. Deliberately not a spinner: the inbox is the whole screen here, and a
 * centred spinner would leave the panel looking broken rather than pending.
 */
function InboxSkeleton() {
  return (
    <div aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 border-b border-[var(--border)] animate-pulse"
          // Fading successive rows suggests a list continuing past the fold instead of six
          // identical bars.
          style={{ opacity: 1 - i * 0.14 }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="h-3 w-28 rounded bg-[var(--secondary)]" />
            <div className="h-2.5 w-10 rounded bg-[var(--secondary)]" />
          </div>
          <div className="h-3 w-52 rounded bg-[var(--secondary)] mt-2" />
          <div className="h-2.5 w-full rounded bg-[var(--secondary)] mt-2" />
        </div>
      ))}
    </div>
  );
}

export function InboxList({
  emails,
  isLoading,
  selectedId,
  onSelect,
}: InboxListProps) {
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
            {/* A count of 0 while loading reads as "empty inbox", which is a different
                (and alarming) claim than "not known yet". */}
            {isLoading ? "…" : `(${emails.length})`}
          </span>
        </h2>
      </div>

      {isLoading ? (
        <InboxSkeleton />
      ) : emails.length === 0 ? (
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <time
                    dateTime={email.receivedAt}
                    title={formatReceivedAtFull(email.receivedAt)}
                    suppressHydrationWarning
                    className={cn(
                      "text-[11px] tabular-nums",
                      isUnread
                        ? "font-semibold text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)]",
                    )}
                  >
                    {formatReceivedAt(email.receivedAt)}
                  </time>
                  {isUnread && (
                    <span className="h-2 w-2 rounded-full bg-[var(--tone)]" />
                  )}
                </div>
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
                          TOPIC_TONE[email.classification.topic],
                        )}
                      >
                        {TOPIC_LABEL[email.classification.topic]}
                      </Badge>
                      {/* course/workType are omitted when "none" — an absence note
                          references no assignment, and a blank badge is just noise. */}
                      {email.classification.course !== "none" && (
                        <Badge variant="outline" className="text-[10px]">
                          {COURSE_LABEL[email.classification.course]}
                        </Badge>
                      )}
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
                  {email.status === "flagged_for_followup" && (
                    <Badge variant="tone" className="text-[10px] tone-amber">
                      Follow up
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
