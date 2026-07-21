"use client";

interface ResizeHandleProps {
  /** Called on every drag move with the pointer's viewport x — the parent owns the math. */
  onResize: (clientX: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  /** Double-click restores the default split. */
  onReset: () => void;
  /** Keyboard nudge: -1 shrinks the chat panel, 1 grows it. */
  onNudge: (direction: -1 | 1) => void;
  /** Chat panel's share of the width, as a percentage — exposed for screen readers. */
  valueNow: number;
}

/**
 * The drag handle between the chat and app panels. It's `max-lg:hidden` because below the
 * `lg` breakpoint app mode hides the chat panel entirely (see the layout), so there are no
 * two panels left to divide.
 *
 * Pointer capture (rather than window listeners) keeps move events coming to this element
 * even when the pointer outruns the 6px hit area mid-drag, which is easy to do.
 */
export function ResizeHandle({
  onResize,
  onResizeStart,
  onResizeEnd,
  onReset,
  onNudge,
  valueNow,
}: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize chat and app panels"
      aria-valuenow={Math.round(valueNow)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      title="Drag to resize — double-click to reset"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onResizeStart();
      }}
      onPointerMove={(e) => {
        // Only track while the button is held; `buttons` is 0 for a plain hover.
        if (e.buttons !== 0) onResize(e.clientX);
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        onResizeEnd();
      }}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault(); // don't scroll the panel while nudging
        onNudge(e.key === "ArrowLeft" ? -1 : 1);
      }}
      className="group relative w-1.5 shrink-0 cursor-col-resize touch-none max-lg:hidden focus:outline-none"
    >
      {/* Hairline that reads as the panel border until you hover/focus the handle. */}
      <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--border)] transition-colors group-hover:w-0.5 group-hover:bg-[var(--muted-foreground)] group-focus:w-0.5 group-focus:bg-[var(--muted-foreground)]" />
    </div>
  );
}
