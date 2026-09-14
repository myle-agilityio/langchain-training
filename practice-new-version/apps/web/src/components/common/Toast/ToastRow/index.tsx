import { useEffect } from "react";
import { Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/utils";
import { useToast, type Toast as ToastItem } from "@/stores";

const AUTO_DISMISS_MS = 6000;

const toneClass = {
  error: "border-tone-red/40 text-tone-red",
  info: "border-border text-foreground",
};

export const ToastRow = ({ toast }: { toast: ToastItem }) => {
  const dismiss = useToast((s) => s.dismiss);
  const Icon = toast.tone === "error" ? TriangleAlert : Info;

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border bg-card px-4 py-3.5 shadow-xl",
        toneClass[toast.tone],
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="min-w-0 flex-1 text-sm text-foreground">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismiss(toast.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
