import { useToast } from "@/stores";
import { ToastRow } from "../ToastRow";

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
