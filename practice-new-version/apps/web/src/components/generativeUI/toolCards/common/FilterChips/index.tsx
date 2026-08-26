import { Badge } from "@/components/common";
import type { EmailFilterArgs } from "@/types";

export const FilterChips = ({ filter }: { filter: EmailFilterArgs }) => {
  const chips = Object.entries(filter).filter(
    ([, v]) => v !== undefined && v !== "",
  );

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {chips.map(([key, value]) => (
        <Badge
          key={key}
          variant="secondary"
          className="text-[10px] font-normal"
        >
          {key}: {String(value)}
        </Badge>
      ))}
    </div>
  );
};
