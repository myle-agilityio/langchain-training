import { useMemo } from "react";
import { useSharedInbox } from "@/stores/use-shared-inbox";

// Tools stringify their result, but a run can still be cut short mid-stream.
export const parseResult = <T>(result: string | undefined): T | null => {
  if (!result) return null;
  try {
    return JSON.parse(result) as T;
  } catch {
    return null;
  }
};

// Tool results carry ids, not sender/subject — the inbox the panel already holds resolves them.
export const useEmailLookup = () => {
  const { emails } = useSharedInbox();
  return useMemo(() => new Map(emails.map((e) => [e.id, e])), [emails]);
};
