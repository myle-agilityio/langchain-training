import { BookOpen } from "lucide-react";
import { Pending, Shell } from "./common";
import type { ToolCardProps } from "@/types";
import { parseResult } from "@/utils";

export const SearchKnowledgeBaseCard = ({
  status,
  parameters,
  result,
}: ToolCardProps<{ query: string }>) => {
  const data = parseResult<{ title: string; content: string }[]>(result);

  return (
    <Shell icon={BookOpen} title="Knowledge base" status={status}>
      {parameters.query && (
        <p className="mb-2 truncate text-[11px] italic text-muted-foreground">
          “{parameters.query}”
        </p>
      )}
      {!data ? (
        <Pending label="Searching policy notes…" />
      ) : data.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nothing relevant found.
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((hit, i) => (
            <div key={`${hit.title}-${i}`} className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                {hit.title}
              </p>
              <p className="line-clamp-2 text-[11px] text-muted-foreground">
                {hit.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
};
