import { Inbox } from "lucide-react";
import type { Classification, EmailStatus } from "@/types/email";
import {
  ClassificationBadges,
  FilterChips,
  Pending,
  Shell,
  ToolFailure,
} from "../common";
import type { EmailFilterArgs, ToolCardProps } from "@/types";
import { parseToolResult } from "@/utils";

interface RedactedEmail {
  id: string;
  from: { name: string };
  subject: string;
  status: EmailStatus;
  classification?: Classification;
}

const MAX_ROWS = 4;

export const GetEmailsCard = ({
  status,
  parameters,
  result,
}: ToolCardProps<{ filter?: EmailFilterArgs }>) => {
  const filter = parameters.filter ?? {};
  const envelope = parseToolResult<{ emails: RedactedEmail[]; count: number }>(
    result,
  );

  return (
    <Shell icon={Inbox} title="Read inbox" status={status}>
      <FilterChips filter={filter} />
      {!envelope ? (
        <Pending label="Fetching emails…" />
      ) : !envelope.ok ? (
        <ToolFailure error={envelope.error} />
      ) : envelope.data.count === 0 ? (
        <p className="text-xs text-muted-foreground">No emails matched.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">
            {envelope.data.count}{" "}
            {envelope.data.count === 1 ? "email" : "emails"}
          </p>
          <div className="space-y-2">
            {envelope.data.emails.slice(0, MAX_ROWS).map((email) => (
              <div key={email.id} className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="min-w-0 truncate text-xs">
                    <span className="font-semibold text-foreground">
                      {email.from.name}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {email.subject}
                    </span>
                  </span>
                </div>
                {email.classification && (
                  <div className="mt-1">
                    <ClassificationBadges
                      classification={email.classification}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          {envelope.data.emails.length > MAX_ROWS && (
            <p className="text-[11px] text-muted-foreground">
              +{envelope.data.emails.length - MAX_ROWS} more
            </p>
          )}
        </div>
      )}
    </Shell>
  );
};
