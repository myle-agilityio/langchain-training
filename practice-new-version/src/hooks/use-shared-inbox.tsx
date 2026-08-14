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
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  patchEmail: (id: string, patch: Partial<Email>) => Promise<void>;
  patchEmails: (ids: string[], patch: Partial<Email>) => Promise<void>;
}

const SharedInboxContext = createContext<SharedInboxValue | null>(null);

/**
 * Whether a refetch actually changed anything. Load-bearing, not an optimization:
 * `onRunFinalized` fires a refetch at the moment an approval card mounts, and handing back a
 * fresh array reference there re-renders this provider's whole subtree — which can feed back
 * into another finalize cycle and trip "Maximum update depth exceeded". Returning the previous
 * reference makes React bail out of the render entirely.
 */
function sameEmails(a: Email[], b: Email[]): boolean {
  return a.length === b.length && JSON.stringify(a) === JSON.stringify(b);
}

export function SharedInboxProvider({ children }: { children: ReactNode }) {
  // updates: [] — we only need the agent HANDLE to subscribe to run completion below.
  // Subscribing to all updates re-renders this provider on every streamed token.
  const { agent } = useAgent({ updates: [] });
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/emails");
      if (!res.ok) throw new Error(`GET /api/emails failed (${res.status})`);
      const data = (await res.json()) as { emails: Email[] };
      setEmails((current) =>
        sameEmails(current, data.emails) ? current : data.emails,
      );
    } catch (error) {
      console.error("Failed to refresh inbox:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Separate from `refresh` on purpose: `isRefreshing` toggles state twice per call, so
  // routing the automatic paths (mount, onRunFinalized) through this would re-render on every
  // run completion even when nothing changed.
  const refreshManually = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const { unsubscribe } = agent.subscribe({
      onRunFinalized: () => {
        refreshRef.current();
      },
    });
    return unsubscribe;
  }, [agent]);

  const patchEmail = useCallback(async (id: string, patch: Partial<Email>) => {
    let previous: Email[] = [];
    setEmails((current) => {
      previous = current;
      return current.map((email) => (email.id === id ? { ...email, ...patch } : email));
    });
    try {
      const res = await fetch("/api/emails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, patch }),
      });
      if (!res.ok) throw new Error(`PATCH /api/emails failed (${res.status})`);
      const data = (await res.json()) as { email: Email };
      setEmails((current) =>
        current.map((email) => (email.id === id ? data.email : email)),
      );
    } catch (error) {
      console.error(`Failed to save update for email ${id}, reverting:`, error);
      setEmails(previous);
    }
  }, []);

  // Bulk sibling of patchEmail — one PATCH for the whole "mark all as read/unread" action
  // instead of N racing requests, one per row.
  const patchEmails = useCallback(async (ids: string[], patch: Partial<Email>) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    let previous: Email[] = [];
    setEmails((current) => {
      previous = current;
      return current.map((email) => (idSet.has(email.id) ? { ...email, ...patch } : email));
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
      setEmails((current) => current.map((email) => updated.get(email.id) ?? email));
    } catch (error) {
      console.error("Failed to save bulk email update, reverting:", error);
      setEmails(previous);
    }
  }, []);

  const value = useMemo(
    () => ({
      emails,
      isLoading,
      isRefreshing,
      refresh: refreshManually,
      patchEmail,
      patchEmails,
    }),
    [emails, isLoading, isRefreshing, refreshManually, patchEmail, patchEmails],
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
