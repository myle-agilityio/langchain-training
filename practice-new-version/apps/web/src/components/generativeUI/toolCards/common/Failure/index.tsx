import { TriangleAlert } from "lucide-react";

export const Failure = ({ text }: { text: string }) => {
  return (
    <span className="flex items-center gap-1 text-[11px] text-tone-red">
      <TriangleAlert className="h-3 w-3 shrink-0" />
      {text}
    </span>
  );
};
