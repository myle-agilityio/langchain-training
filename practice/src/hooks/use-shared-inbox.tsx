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

interface SharedInboxValue {
  emails: Email[];
  /** True until the first fetch settles. Consumers render a skeleton rather than an inbox. */
  isLoading: boolean;
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
  // Starts empty, not from the static seed file. Seeding the first paint meant the list
  // rendered untriaged emails and then visibly rewrote itself the moment the fetch landed —
  // the seed file is a *database* seed, so it can't reflect any triage done since. A skeleton
  // for one fetch is less confusing than data that changes under the reader.
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/emails");
      if (!res.ok) return;
      const data = (await res.json()) as { emails: Email[] };
      setEmails(data.emails);
    } finally {
      // Also clears on a failed fetch: the skeleton means "still loading", and leaving it up
      // forever would misreport a dead API as a slow one.
      setIsLoading(false);
    }
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

  const value = useMemo(
    () => ({ emails, isLoading, patchEmail }),
    [emails, isLoading, patchEmail],
  );

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
