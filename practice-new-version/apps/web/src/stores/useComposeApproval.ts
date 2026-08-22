import { create } from "zustand";

interface ComposeApprovalState {
  awaitingApproval: boolean;
  openInterrupt: () => void;
  clearInterrupt: () => void;
}

// Whether the graph is paused on a compose_reply interrupt. One logical flag written from three
// places — the run lifecycle, the approval card, and a thread switch — so it can't be local state.
export const useComposeApproval = create<ComposeApprovalState>((set) => ({
  awaitingApproval: false,
  openInterrupt: () => set({ awaitingApproval: true }),
  clearInterrupt: () => set({ awaitingApproval: false }),
}));
