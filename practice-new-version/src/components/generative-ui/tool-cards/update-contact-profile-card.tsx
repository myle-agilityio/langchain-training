import { UserRoundCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Failure, Pending, Shell } from "./common";
import type { ToolCardProps } from "@/types";
import { parseResult } from "@/utils";

interface ProfileResult {
  ok: boolean;
  profile?: { name: string; tone: string | null; facts: string[] };
  error?: string;
}

export function UpdateContactProfileCard({
  status,
  parameters,
  result,
}: ToolCardProps<{ sender: string; tone?: string; facts?: string[] }>) {
  const data = parseResult<ProfileResult>(result);

  return (
    <Shell icon={UserRoundCog} title="Remember about contact" status={status}>
      {!data ? (
        <Pending
          label={
            parameters.sender
              ? `Saving notes on ${parameters.sender}…`
              : "Saving…"
          }
        />
      ) : !data.ok || !data.profile ? (
        <Failure text={data.error ?? "Could not save"} />
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            {data.profile.name}
          </p>
          {data.profile.tone && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--muted-foreground)]">
                Tone
              </span>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {data.profile.tone}
              </Badge>
            </div>
          )}
          {data.profile.facts.length > 0 && (
            <ul className="space-y-1">
              {data.profile.facts.map((fact) => (
                <li
                  key={fact}
                  className="flex gap-1.5 text-[11px] text-[var(--muted-foreground)]"
                >
                  <span className="text-[var(--tone-green)]">•</span>
                  {fact}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Shell>
  );
}
