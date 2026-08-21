import { cn } from "@/lib/utils";

const sizeClass = {
  sm: "size-4 border-2",
  md: "size-6 border-2",
  lg: "size-8 border-3",
};

interface SpinnerProps {
  className?: string;
  size?: keyof typeof sizeClass;
}

export const Spinner = ({ className, size = "md" }: SpinnerProps) => (
  <span
    className={cn(
      "inline-block animate-spin rounded-full border-muted border-t-primary",
      sizeClass[size],
      className,
    )}
  />
);
