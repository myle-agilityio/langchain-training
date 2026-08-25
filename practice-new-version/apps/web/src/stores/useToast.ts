import { create } from "zustand";

export type ToastTone = "error" | "info";

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (tone: ToastTone, message: string) => void;
  dismiss: (id: string) => void;
}

// Cap the stack so a burst of failed requests can't bury the app.
const MAX_TOASTS = 3;

// Client-only state, like the other stores here. Read outside React with
// useToast.getState() — queryClient.ts is the one caller that does.
export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (tone, message) =>
    set((state) =>
      // Same message already up (a bulk action failing per row) — don't stack duplicates.
      state.toasts.some((t) => t.message === message)
        ? state
        : {
            toasts: [
              ...state.toasts,
              { id: crypto.randomUUID(), tone, message },
            ].slice(-MAX_TOASTS),
          },
    ),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  error: (message: string) => useToast.getState().push("error", message),
  info: (message: string) => useToast.getState().push("info", message),
};
