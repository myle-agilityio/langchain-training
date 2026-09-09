import { useRef } from "react";
import { cn } from "@/utils";

interface SplitDividerProps {
  onDrag: (deltaX: number) => void;
  // Fired around the gesture so the caller can drop its width transition while live-dragging.
  onDragStart?: () => void;
  onDragEnd?: () => void;
  className?: string;
}

// Drag handle between two flex panes. Reports the pointer's horizontal movement each frame via
// `onDrag` and holds no size state itself — pointer capture keeps events coming even once the
// cursor leaves the handle's own bounds.
export const SplitDivider = ({
  onDrag,
  onDragStart,
  onDragEnd,
  className,
}: SplitDividerProps) => {
  const lastXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    isDraggingRef.current = true;
    lastXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
    onDragStart?.();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      return;
    }

    onDrag(event.clientX - lastXRef.current);
    lastXRef.current = event.clientX;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    onDragEnd?.();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={cn(
        "group relative w-6 shrink-0 cursor-col-resize touch-none select-none",
        className,
      )}
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-ring" />
    </div>
  );
};
