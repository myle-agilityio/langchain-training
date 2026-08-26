import type { ComponentType } from "react";
import { Check } from "lucide-react";
import { Spinner } from "@/components/common";
import type { ToolStatus } from "@/types";

export const Shell = ({
  icon: Icon,
  title,
  status,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  status: ToolStatus;
  children: React.ReactNode;
}) => {
  return (
    <div className="my-1.5 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-xs font-semibold text-foreground">
          {title}
        </span>
        <span className="ml-auto shrink-0">
          {status === "complete" ? (
            <Check className="h-3 w-3 text-tone-green" />
          ) : (
            <Spinner size="sm" className="h-3 w-3" />
          )}
        </span>
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </div>
  );
};
