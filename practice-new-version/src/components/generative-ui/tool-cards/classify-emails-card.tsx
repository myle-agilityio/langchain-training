import { Tags } from "lucide-react";
import type { Classification } from "@/types/email";
import {
  ClassificationBadges,
  EmailLine,
  Failure,
  Pending,
  Shell,
} from "./common";
import type { ToolCardProps } from "@/types";
import { parseResult } from "@/utils";

interface ClassifyResult {
  id: string;
  ok: boolean;
  classification?: Classification;
  error?: string;
}

export function ClassifyEmailsCard({
  status,
  parameters,
  result,
}: ToolCardProps<{ ids: string[] }>) {
  const ids = parameters.ids ?? [];
  const data = parseResult<{ results: ClassifyResult[] }>(result);

  return (
    <Shell icon={Tags} title="Classify emails" status={status}>
      {!data ? (
        <Pending
          label={
            ids.length
              ? `Classifying ${ids.length} ${ids.length === 1 ? "email" : "emails"}…`
              : "Classifying…"
          }
        />
      ) : (
        <div className="space-y-2.5">
          {data.results.map((r) => (
            <div key={r.id} className="min-w-0">
              <div className="flex min-w-0">
                <EmailLine id={r.id} />
              </div>
              <div className="mt-1">
                {r.ok && r.classification ? (
                  <ClassificationBadges classification={r.classification} />
                ) : (
                  <Failure text={r.error ?? "failed"} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
