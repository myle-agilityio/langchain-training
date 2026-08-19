import type { ComponentType } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  COURSE_LABEL,
  TOPIC_LABEL,
  TOPIC_TONE,
  URGENCY_TONE,
  URGENCY_VARIANT,
  WORK_TYPE_LABEL,
} from "@/components/email-inbox/inbox-list";
import type { Classification } from "@/types/email";
import type { ToolStatus, EmailFilterArgs } from "@/types";
import { useEmailLookup } from "@/utils";

export function Shell({
  icon: Icon,
  title,
  status,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  status: ToolStatus;
  children: React.ReactNode;
}) {
  return (
    <div className="my-1.5 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
        <span className="truncate text-xs font-semibold text-[var(--foreground)]">
          {title}
        </span>
        <span className="ml-auto shrink-0">
          {status === "complete" ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Spinner size="sm" className="h-3 w-3" />
          )}
        </span>
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </div>
  );
}

export function Pending({ label }: { label: string }) {
  return <p className="text-xs text-[var(--muted-foreground)]">{label}</p>;
}

export function Failure({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-[var(--tone-red)]">
      <TriangleAlert className="h-3 w-3 shrink-0" />
      {text}
    </span>
  );
}

export function ClassificationBadges({
  classification,
}: {
  classification: Classification;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge
        variant="tone"
        className={cn("text-[10px]", TOPIC_TONE[classification.topic])}
      >
        {TOPIC_LABEL[classification.topic]}
      </Badge>
      {classification.course !== "none" && (
        <Badge variant="outline" className="text-[10px]">
          {COURSE_LABEL[classification.course]}
        </Badge>
      )}
      {classification.workType !== "none" && (
        <Badge variant="outline" className="text-[10px]">
          {WORK_TYPE_LABEL[classification.workType]}
        </Badge>
      )}
      <Badge
        variant={URGENCY_VARIANT[classification.urgency]}
        className={cn("text-[10px]", URGENCY_TONE[classification.urgency])}
      >
        {classification.urgency}
      </Badge>
    </div>
  );
}

export function EmailLine({ id, fallback }: { id: string; fallback?: string }) {
  const lookup = useEmailLookup();
  const email = lookup.get(id);
  if (!email) {
    return (
      <span className="text-xs text-[var(--muted-foreground)]">
        {fallback ?? id.slice(0, 8)}
      </span>
    );
  }
  return (
    <span className="min-w-0 truncate text-xs">
      <span className="font-semibold text-[var(--foreground)]">
        {email.from.name}
      </span>
      <span className="text-[var(--muted-foreground)]"> · {email.subject}</span>
    </span>
  );
}

export function FilterChips({ filter }: { filter: EmailFilterArgs }) {
  const chips = Object.entries(filter).filter(
    ([, v]) => v !== undefined && v !== "",
  );
  if (chips.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {chips.map(([key, value]) => (
        <Badge
          key={key}
          variant="secondary"
          className="text-[10px] font-normal"
        >
          {key}: {String(value)}
        </Badge>
      ))}
    </div>
  );
}
