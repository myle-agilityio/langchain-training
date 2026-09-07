import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { EmailsPage } from "@/api";
import { inboxQueryKey } from "@/hooks";
import { sampleEmails } from "./fixtures";

// The inbox is pre-seeded so hooks that read it (useEmailLookup, and the cards through it)
// resolve ids without a request; staleTime Infinity keeps them from refetching over it.
const createClient = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  client.setQueryData(inboxQueryKey, {
    pageParams: [0],
    pages: [{ emails: sampleEmails, hasNext: false } satisfies EmailsPage],
  });

  return client;
};

// The app's providers minus CopilotKit: every story gets a fresh query client (so one story's
// writes can't leak into the next) and a router for the URL-backed selection state.
export const StoryProviders = ({ children }: { children: ReactNode }) => {
  const [client] = useState(createClient);

  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};
