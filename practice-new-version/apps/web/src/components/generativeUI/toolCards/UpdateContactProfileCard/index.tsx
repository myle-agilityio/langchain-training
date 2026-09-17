import { UserRoundCog } from "lucide-react";
import { Badge } from "@/components/common";
import { Pending, Shell, ToolFailure } from "../common";
import type { ToolCardProps } from "@/types";
import { parseToolResult } from "@/utils";

// Not tied to one inbox sender — the tool skips saving a contact profile and says so, rather
// than failing. General facts about the teacher are captured automatically instead.
type ProfileResult =
  | { profile: { name: string; tone: string | null; facts: string[] } }
  | { skipped: true };

export const UpdateContactProfileCard = ({
  status,
  parameters,
  result,
}: ToolCardProps<{ sender: string; tone?: string; facts?: string[] }>) => {
  const envelope = parseToolResult<ProfileResult>(result);

  return (
    <Shell
      icon={UserRoundCog}
      title="Remember about contact"
      status={status}
      hasError={!!envelope && !envelope.ok}
    >
      {!envelope ? (
        <Pending
          label={
            parameters.sender
              ? `Saving notes on ${parameters.sender}…`
              : "Saving…"
          }
        />
      ) : !envelope.ok ? (
        <ToolFailure error={envelope.error} />
      ) : "skipped" in envelope.data ? (
        <p className="text-[11px] text-muted-foreground">
          Not tied to a specific contact — noted as general context instead.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">
            {envelope.data.profile.name}
          </p>
          {envelope.data.profile.tone && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground">Tone</span>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {envelope.data.profile.tone}
              </Badge>
            </div>
          )}
          {envelope.data.profile.facts.length > 0 && (
            <ul className="space-y-1">
              {envelope.data.profile.facts.map((fact) => (
                <li
                  key={fact}
                  className="flex gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span className="text-tone-green">•</span>
                  {fact}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Shell>
  );
};
