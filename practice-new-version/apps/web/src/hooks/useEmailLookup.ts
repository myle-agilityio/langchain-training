import { useMemo } from "react";

import { useSharedInbox } from "./useSharedInbox";

// Tool results carry ids, not sender/subject — the inbox the panel already holds resolves them.
export const useEmailLookup = () => {
  const { emails } = useSharedInbox();
  return useMemo(() => new Map(emails.map((e) => [e.id, e])), [emails]);
};
