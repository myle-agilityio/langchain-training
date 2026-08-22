import { useEffect, useRef } from "react";
import { Wrench, Check, ChevronDown } from "lucide-react";
import { Spinner } from "@/components/common";

interface ToolReasoningProps {
  name: string;
  args?: object | unknown;
  status: string;
}

const formatValue = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object" && value !== null)
    return `{${Object.keys(value).length} keys}`;
  if (typeof value === "string") return `"${value}"`;
  return String(value);
};

export const ToolReasoning = ({ name, args, status }: ToolReasoningProps) => {
  const entries = args ? Object.entries(args) : [];
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const isRunning = status === "executing" || status === "inProgress";

  // Auto-open while executing, auto-close when complete
  useEffect(() => {
    if (!detailsRef.current) return;
    detailsRef.current.open = isRunning;
  }, [isRunning]);

  const statusIcon = isRunning ? (
    <Spinner size="sm" className="h-3 w-3" />
  ) : (
    <Check className="h-3 w-3 text-tone-green" />
  );

  return (
    <div className="my-1.5">
      {entries.length > 0 ? (
        <details ref={detailsRef} open className="group">
          <summary className="flex items-center gap-2 cursor-pointer list-none text-sm text-muted-foreground hover:text-foreground transition-colors">
            {statusIcon}
            <Wrench className="h-3 w-3" />
            <span className="font-mono font-medium">{name}</span>
            <ChevronDown className="h-3 w-3 ml-auto transition-transform group-open:rotate-180" />
          </summary>
          <div className="ml-5 mt-1.5 rounded-md bg-secondary px-3 py-2 space-y-1">
            {entries.map(([key, value]) => (
              <div key={key} className="flex gap-2 min-w-0 font-mono text-xs">
                <span className="text-muted-foreground shrink-0">{key}:</span>
                <span className="text-foreground truncate">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {statusIcon}
          <Wrench className="h-3 w-3" />
          <span className="font-mono font-medium">{name}</span>
        </div>
      )}
    </div>
  );
};
