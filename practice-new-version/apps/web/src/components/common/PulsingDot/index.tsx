import { cn } from "@/utils";

interface PulsingDotProps {
  className?: string;
}

export const PulsingDot = ({ className }: PulsingDotProps) => (
  <span
    className={cn(
      "pulsing-dot inline-block size-1.5 rounded-full bg-muted-foreground",
      className,
    )}
  />
);
