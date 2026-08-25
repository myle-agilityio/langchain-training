import { MailCheck } from "lucide-react";
import { Badge } from "@/components/common";
import type { EmailStatus } from "@/types/email";
import { EmailLine, Pending, Shell, ToolFailure } from "../common";
import { STATUS_LABEL, STATUS_TONE } from "@/constants";
import type { ToolCardProps, ToolError } from "@/types";
import { cn, parseToolResult } from "@/utils";

type StatusResult =
  | { id: string; ok: true; status: EmailStatus }
  | { id: string; ok: false; error: ToolError };

export const UpdateEmailStatusCard = ({
  status,
  parameters,
  result,
}: ToolCardProps<{ patches: { id: string; status: EmailStatus }[] }>) => {
  const patches = parameters.patches ?? [];
  const envelope = parseToolResult<{ results: StatusResult[] }>(result);

  return (
    <Shell icon={MailCheck} title="Update status" status={status}>
      {!envelope ? (
        <Pending
          label={
            patches.length
              ? `Updating ${patches.length} ${patches.length === 1 ? "email" : "emails"}…`
              : "Updating…"
          }
        />
      ) : !envelope.ok ? (
        <ToolFailure error={envelope.error} />
      ) : (
        <div className="space-y-2">
          {envelope.data.results.map((r) => (
            <div key={r.id} className="flex min-w-0 items-center gap-2">
              <EmailLine id={r.id} />
              <span className="ml-auto shrink-0">
                {r.ok ? (
                  <Badge
                    variant="tone"
                    className={cn("text-[10px]", STATUS_TONE[r.status])}
                  >
                    {STATUS_LABEL[r.status]}
                  </Badge>
                ) : (
                  <ToolFailure error={r.error} />
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
};
