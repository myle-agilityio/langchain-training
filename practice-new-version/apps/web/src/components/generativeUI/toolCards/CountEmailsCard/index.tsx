import { Tags } from "lucide-react";
import type {
  Course,
  EmailStatus,
  EmailTopic,
  WorkType,
  EmailFilterArgs,
  ToolCardProps,
} from "@/types";
import { FilterChips, Pending, Shell, ToolFailure } from "../common";
import {
  COURSE_LABEL,
  FALLBACK_TONE,
  STATUS_LABEL,
  TOPIC_LABEL,
  WORK_TYPE_LABEL,
} from "@/constants";
import { cn, parseToolResult } from "@/utils";

type GroupBy = "status" | "topic" | "course" | "workType" | "urgency";

const groupLabel = (groupBy: GroupBy | undefined, value: string): string => {
  if (value === "unclassified") {
    return "Unclassified";
  }

  switch (groupBy) {
    case "status":
      return STATUS_LABEL[value as EmailStatus] ?? value;
    case "topic":
      return TOPIC_LABEL[value as EmailTopic] ?? value;
    case "course":
      return COURSE_LABEL[value as Course] || "No course";
    case "workType":
      return WORK_TYPE_LABEL[value as WorkType] || "No work type";
    default:
      return value;
  }
};

export const CountEmailsCard = ({
  status,
  parameters,
  result,
}: ToolCardProps<{ filter?: EmailFilterArgs; groupBy?: GroupBy }>) => {
  const envelope = parseToolResult<{
    total: number;
    byGroup?: Record<string, number>;
  }>(result);
  const data = envelope?.ok ? envelope.data : undefined;
  // Sorted by size, single hue: the bar carries magnitude, the label carries identity.
  const groups = Object.entries(data?.byGroup ?? {}).sort(
    (a, b) => b[1] - a[1],
  );
  const max = Math.max(...groups.map(([, n]) => n), 1);

  return (
    <Shell icon={Tags} title="Count emails" status={status}>
      <FilterChips filter={parameters.filter ?? {}} />
      {!envelope ? (
        <Pending label="Counting…" />
      ) : !envelope.ok ? (
        <ToolFailure error={envelope.error} />
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums text-foreground">
              {envelope.data.total}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {envelope.data.total === 1 ? "email" : "emails"}
            </span>
          </div>
          {groups.length > 0 && (
            <div className={cn(FALLBACK_TONE, "space-y-1.5")}>
              {groups.map(([value, n]) => (
                <div key={value} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-[11px] text-muted-foreground">
                    {groupLabel(parameters.groupBy, value)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-(--tone)"
                      style={{ width: `${(n / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums text-foreground">
                    {n}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Shell>
  );
};
