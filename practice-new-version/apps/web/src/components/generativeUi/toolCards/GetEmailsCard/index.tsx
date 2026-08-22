import { Inbox } from "lucide-react";
import type { Classification, EmailStatus } from "@/types/email";
import { ClassificationBadges, FilterChips, Pending, Shell } from "../common";
import type { EmailFilterArgs, ToolCardProps } from "@/types";
import { parseResult } from "@/utils";

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
  const data = parseResult<{ emails: RedactedEmail[]; count: number }>(result);

  return (
    <Shell icon={Inbox} title="Read inbox" status={status}>
      <FilterChips filter={filter} />
      {!data ? (
        <Pending label="Fetching emails…" />
      ) : data.count === 0 ? (
        <p className="text-xs text-muted-foreground">No emails matched.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">
            {data.count} {data.count === 1 ? "email" : "emails"}
          </p>
          <div className="space-y-2">
            {data.emails.slice(0, MAX_ROWS).map((email) => (
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
          {data.emails.length > MAX_ROWS && (
            <p className="text-[11px] text-muted-foreground">
              +{data.emails.length - MAX_ROWS} more
            </p>
          )}
        </div>
      )}
    </Shell>
  );
};
