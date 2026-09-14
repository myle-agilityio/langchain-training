import { Wrench } from "lucide-react";
import type { ToolStatus } from "@/types";
import { Pending, Shell, ToolFailure } from "../common";
import { parseToolResult } from "@/utils";

const formatValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }

  if (typeof value === "object" && value !== null) {
    return `{${Object.keys(value).length} keys}`;
  }

  if (typeof value === "string") {
    return `"${value}"`;
  }

  return String(value);
};

interface GenericToolCardProps {
  name: string;
  status: ToolStatus;
  parameters?: unknown;
  result?: string;
}

// The wildcard fallback for a tool call with no dedicated card — shows its raw arguments so
// the teacher (and whoever's debugging) can still see what ran, without knowing its shape.
export const GenericToolCard = ({
  name,
  status,
  parameters,
  result,
}: GenericToolCardProps) => {
  const entries =
    typeof parameters === "object" && parameters !== null
      ? Object.entries(parameters)
      : [];
  const envelope = parseToolResult(result);

  return (
    <Shell
      icon={Wrench}
      title={name}
      status={status}
      hasError={!!envelope && !envelope.ok}
    >
      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex min-w-0 gap-2 font-mono text-[11px]">
              <span className="shrink-0 text-muted-foreground">{key}:</span>
              <span className="truncate text-foreground">
                {formatValue(value)}
              </span>
            </div>
          ))}
        </div>
      )}
      {status !== "complete" ? (
        <Pending label="Running…" />
      ) : envelope && !envelope.ok ? (
        <ToolFailure error={envelope.error} />
      ) : (
        <p className="text-xs text-muted-foreground">Done.</p>
      )}
    </Shell>
  );
};
