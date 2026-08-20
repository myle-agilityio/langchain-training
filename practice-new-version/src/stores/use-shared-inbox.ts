import { useEffect } from "react";
import { create } from "zustand";
import { useAgent } from "@copilotkit/react-core/v2";
import type { Email } from "@/types/email";

interface SharedInboxState {
  emails: Email[];
  isLoading: boolean;
  isRefreshing: boolean;
  fetchEmails: () => Promise<void>;
  refresh: () => Promise<void>;
  patchEmail: (id: string, patch: Partial<Email>) => Promise<void>;
  patchEmails: (ids: string[], patch: Partial<Email>) => Promise<void>;
}

// Load-bearing, not an optimization: a fresh reference here on onRunFinalized's
// refetch can feed back into another finalize cycle and trip "Maximum update depth exceeded".
const sameEmails = (a: Email[], b: Email[]): boolean => {
  return a.length === b.length && JSON.stringify(a) === JSON.stringify(b);
};

export const useSharedInbox = create<SharedInboxState>((set, get) => ({
  emails: [],
  isLoading: true,
  isRefreshing: false,

  // Silent refetch — used by the automatic paths (mount, onRunFinalized) so they don't toggle
  // isRefreshing and re-render subscribers on every run completion.
  fetchEmails: async () => {
    try {
      const res = await fetch("/api/emails");
      if (!res.ok) throw new Error(`GET /api/emails failed (${res.status})`);
      const data = (await res.json()) as { emails: Email[] };
      set((state) => ({
        emails: sameEmails(state.emails, data.emails)
          ? state.emails
          : data.emails,
      }));
    } catch (error) {
      console.error("Failed to refresh inbox:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  refresh: async () => {
    set({ isRefreshing: true });
    try {
      await get().fetchEmails();
    } finally {
      set({ isRefreshing: false });
    }
  },

  patchEmail: async (id, patch) => {
    const previous = get().emails;
    set({
      emails: previous.map((email) =>
        email.id === id ? { ...email, ...patch } : email,
      ),
    });
    try {
      const res = await fetch("/api/emails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, patch }),
      });
      if (!res.ok) throw new Error(`PATCH /api/emails failed (${res.status})`);
      const data = (await res.json()) as { email: Email };
      set((state) => ({
        emails: state.emails.map((email) =>
          email.id === id ? data.email : email,
        ),
      }));
    } catch (error) {
      console.error(`Failed to save update for email ${id}, reverting:`, error);
      set({ emails: previous });
    }
  },

  // Bulk sibling of patchEmail — one PATCH for the whole "mark all as read/unread" action
  // instead of N racing requests, one per row.
  patchEmails: async (ids, patch) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const previous = get().emails;
    set({
      emails: previous.map((email) =>
        idSet.has(email.id) ? { ...email, ...patch } : email,
      ),
    });
    try {
      const res = await fetch("/api/emails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, patch }),
      });
      if (!res.ok) throw new Error(`PATCH /api/emails (bulk) failed (${res.status})`);
      const data = (await res.json()) as { emails: Email[] };
      const updated = new Map(data.emails.map((email) => [email.id, email]));
      set((state) => ({
        emails: state.emails.map((email) => updated.get(email.id) ?? email),
      }));
    } catch (error) {
      console.error("Failed to save bulk email update, reverting:", error);
      set({ emails: previous });
    }
  },
}));

// Keeps the store fresh from the agent's run lifecycle. Needs useAgent(), which only resolves
// inside CopilotChatConfigurationProvider — call this once from a component in that subtree.
export const useSyncSharedInboxWithAgent = () => {
  // updates: [] — we only need the agent HANDLE to subscribe to run completion below.
  // Subscribing to all updates would re-render this component on every streamed token.
  const { agent } = useAgent({ updates: [] });
  const fetchEmails = useSharedInbox((state) => state.fetchEmails);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onRunFinalized: () => {
        fetchEmails();
      },
    });
    return unsubscribe;
  }, [agent, fetchEmails]);
};
