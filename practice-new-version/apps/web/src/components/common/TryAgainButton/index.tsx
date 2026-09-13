import { RefreshCw } from "lucide-react";
import { cn } from "@/utils";

const sizeClass = {
  sm: { text: "text-sm", icon: "h-3.5 w-3.5" },
  xs: { text: "text-xs", icon: "h-3 w-3" },
};

interface TryAgainButtonProps {
  onClick: () => void;
  size?: keyof typeof sizeClass;
  className?: string;
}

// Text-styled retry action for a spot that already carries an error message — a refresh icon
// beside clickable text, not a boxed button, since it never stands alone.
export const TryAgainButton = ({
  onClick,
  size = "sm",
  className,
}: TryAgainButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 font-medium text-gray-500 hover:underline cursor-pointer",
      sizeClass[size].text,
      className,
    )}
  >
    Try again
    <RefreshCw className={sizeClass[size].icon} />
  </button>
);
