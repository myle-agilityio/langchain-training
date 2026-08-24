import { Tags } from "lucide-react";
import type { Classification } from "@/types/email";
import {
  ClassificationBadges,
  EmailLine,
  Pending,
  Shell,
  ToolFailure,
} from "../common";
import type { ToolCardProps, ToolError } from "@/types";
import { parseToolResult } from "@/utils";

type ClassifyResult =
  | { id: string; ok: true; classification: Classification }
  | { id: string; ok: false; error: ToolError };

export const ClassifyEmailsCard = ({
  status,
  parameters,
  result,
}: ToolCardProps<{ ids: string[] }>) => {
  const ids = parameters.ids ?? [];
  const envelope = parseToolResult<{ results: ClassifyResult[] }>(result);

  return (
    <Shell icon={Tags} title="Classify emails" status={status}>
      {!envelope ? (
        <Pending
          label={
            ids.length
              ? `Classifying ${ids.length} ${ids.length === 1 ? "email" : "emails"}…`
              : "Classifying…"
          }
        />
      ) : !envelope.ok ? (
        <ToolFailure error={envelope.error} />
      ) : (
        <div className="space-y-2.5">
          {envelope.data.results.map((r) => (
            <div key={r.id} className="min-w-0">
              <div className="flex min-w-0">
                <EmailLine id={r.id} />
              </div>
              <div className="mt-1">
                {r.ok ? (
                  <ClassificationBadges classification={r.classification} />
                ) : (
                  <ToolFailure error={r.error} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
};
