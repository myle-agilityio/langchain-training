import type { ComponentType, ReactNode } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { ToolBusyIndicator } from "../ToolBusyIndicator";
import type { ToolStatus } from "@/types";

export const Shell = ({
  icon: Icon,
  title,
  status,
  hasError = false,
  // Overrides the default complete-state icon (Check/TriangleAlert) — for an outcome that's
  // neither a plain success nor an error, e.g. ReplyToEmailCard's rejected-draft X.
  customStatusIcon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  status: ToolStatus;
  hasError?: boolean;
  customStatusIcon?: ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <div className="my-1.5 max-w-[400px] overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs font-semibold text-foreground">
          {title}
        </span>
        <span className="ml-auto shrink-0">
          {status !== "complete" ? (
            <ToolBusyIndicator />
          ) : customStatusIcon ? (
            customStatusIcon
          ) : hasError ? (
            <TriangleAlert className="h-3 w-3 text-tone-red" />
          ) : (
            <Check className="h-3 w-3 text-tone-green" />
          )}
        </span>
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </div>
  );
};
