import { BookOpen } from "lucide-react";
import { Pending, Shell, ToolFailure } from "../common";
import type { ToolCardProps } from "@/types";
import { parseToolResult } from "@/utils";

export const SearchKnowledgeBaseCard = ({
  status,
  parameters,
  result,
}: ToolCardProps<{ query: string }>) => {
  const envelope = parseToolResult<{
    articles: { title: string; content: string }[];
  }>(result);

  return (
    <Shell icon={BookOpen} title="Knowledge base" status={status}>
      {parameters.query && (
        <p className="mb-2 truncate text-[11px] italic text-muted-foreground">
          “{parameters.query}”
        </p>
      )}
      {!envelope ? (
        <Pending label="Searching policy notes…" />
      ) : !envelope.ok ? (
        <ToolFailure error={envelope.error} />
      ) : envelope.data.articles.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing relevant found.</p>
      ) : (
        <div className="space-y-2">
          {envelope.data.articles.map((hit, i) => (
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
