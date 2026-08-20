import { MailCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { EmailStatus } from "@/types/email";
import { EmailLine, Failure, Pending, Shell } from "./Common";
import { STATUS_LABEL, STATUS_TONE } from "@/constants";
import type { ToolCardProps } from "@/types";
import { parseResult } from "@/utils";

interface StatusResult {
  id: string;
  ok: boolean;
  status?: EmailStatus;
  error?: string;
}

export const UpdateEmailStatusCard = ({
  status,
  parameters,
  result,
}: ToolCardProps<{ patches: { id: string; status: EmailStatus }[] }>) => {
  const patches = parameters.patches ?? [];
  const data = parseResult<{ results: StatusResult[] }>(result);

  return (
    <Shell icon={MailCheck} title="Update status" status={status}>
      {!data ? (
        <Pending
          label={
            patches.length
              ? `Updating ${patches.length} ${patches.length === 1 ? "email" : "emails"}…`
              : "Updating…"
          }
        />
      ) : (
        <div className="space-y-2">
          {data.results.map((r) => (
            <div key={r.id} className="flex min-w-0 items-center gap-2">
              <EmailLine id={r.id} />
              <span className="ml-auto shrink-0">
                {r.ok && r.status ? (
                  <Badge
                    variant="tone"
                    className={cn("text-[10px]", STATUS_TONE[r.status])}
                  >
                    {STATUS_LABEL[r.status]}
                  </Badge>
                ) : (
                  <Failure text={r.error ?? "failed"} />
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
};
