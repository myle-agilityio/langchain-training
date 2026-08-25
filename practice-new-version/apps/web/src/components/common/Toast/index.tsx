import { useEffect } from "react";
import { TriangleAlert, Info, X } from "lucide-react";

import { cn } from "@/utils";
import { useToast, type Toast as ToastItem } from "@/stores";

const AUTO_DISMISS_MS = 6000;

const toneClass = {
  error: "border-tone-red/40 text-tone-red",
  info: "border-border text-foreground",
};

const ToastRow = ({ toast }: { toast: ToastItem }) => {
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
        "pointer-events-auto flex items-start gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-lg",
        toneClass[toast.tone],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0 flex-1 text-xs text-foreground">{toast.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismiss(toast.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// Mounted once at the app root; everything else pushes through the store's `toast` helper.
export const Toaster = () => {
  const toasts = useToast((s) => s.toasts);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
