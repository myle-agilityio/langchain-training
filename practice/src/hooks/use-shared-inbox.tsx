"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import type { Email } from "@/types/email";
import { seedEmails } from "@/data/seed-emails";

interface SharedInboxValue {
  emails: Email[];
  patchEmail: (id: string, patch: Partial<Email>) => Promise<void>;
}

const SharedInboxContext = createContext<SharedInboxValue | null>(null);

// The inbox now lives in the agent's cross-thread Store instead of per-thread
// agent.state (see agent/src/tools/emails/store.ts), so this provider — not
// useAgent()'s per-thread state — is the single source of truth every consumer
// (EmailInbox, EmailReplyCard) reads from, regardless of which chat thread is active.
export function SharedInboxProvider({ children }: { children: ReactNode }) {
  // updates: [] — we only need the agent HANDLE (to subscribe to run completion
  // below), not a re-render on every message/state/status event. Subscribing to all
  // updates here re-rendered this provider (and its whole subtree) on every streamed
  // token during a run; combined with the onRunFinalized→refresh→setEmails effect it
  // produced a re-render storm that tripped React's "maximum update depth".
  const { agent } = useAgent({ updates: [] });
  const [emails, setEmails] = useState<Email[]>(seedEmails);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/emails");
    if (!res.ok) return;
    const data = (await res.json()) as { emails: Email[] };
    setEmails(data.emails);
  }, []);

  // Keep the subscribe effect from re-binding (and thus re-subscribing) when refresh's
  // identity is irrelevant — read it through a ref so the effect depends only on `agent`.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    // Chat-driven mutations (manage_emails classifying/marking read) write straight to
    // the store from the agent process, so they don't stream to this component the way
    // agent.state used to — refetch once a run settles to pick those up.
    const { unsubscribe } = agent.subscribe({
      onRunFinalized: () => {
        refreshRef.current();
      },
    });
    return unsubscribe;
  }, [agent]);

  const patchEmail = useCallback(async (id: string, patch: Partial<Email>) => {
    setEmails((current) =>
      current.map((email) => (email.id === id ? { ...email, ...patch } : email)),
    );
    const res = await fetch("/api/emails", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, patch }),
    });
    if (res.ok) {
      const data = (await res.json()) as { email: Email };
      setEmails((current) =>
        current.map((email) => (email.id === id ? data.email : email)),
      );
    }
  }, []);

  const value = useMemo(() => ({ emails, patchEmail }), [emails, patchEmail]);

  return (
    <SharedInboxContext.Provider value={value}>
      {children}
    </SharedInboxContext.Provider>
  );
}

export function useSharedInbox(): SharedInboxValue {
  const ctx = useContext(SharedInboxContext);
  if (!ctx) {
    throw new Error("useSharedInbox must be used within a SharedInboxProvider");
  }
  return ctx;
}
