import type { BaseStore } from "@langchain/langgraph";

import { EmailSchema, type Email } from "./schema.js";
import { seedEmails } from "./seed-data.js";

// The inbox lives in LangGraph's cross-thread Store rather than per-thread graph
// state, so every thread reads/writes the same shared mailbox instead of forking
// its own copy the moment a tool patches it. `langgraph dev`/the deployed API
// server attaches a store to every compiled graph automatically (see
// @langchain/langgraph-api's graph/load.ts), so no extra wiring is needed in
// agent.ts to make `runtime.store` available inside tools.
const NAMESPACE = ["emails"];

function byReceivedAtDesc(a: Email, b: Email): number {
  return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
}

export async function loadEmails(store: BaseStore): Promise<Email[]> {
  const items = await store.search(NAMESPACE, { limit: 1000 });
  if (items.length === 0) {
    // First read ever: seed the store so it's not empty on next read from any thread.
    await Promise.all(
      seedEmails.map((email) => store.put(NAMESPACE, email.id, email)),
    );
    return [...seedEmails].sort(byReceivedAtDesc);
  }
  return items.map((item) => EmailSchema.parse(item.value)).sort(byReceivedAtDesc);
}

export async function saveEmail(store: BaseStore, email: Email): Promise<void> {
  await store.put(NAMESPACE, email.id, email);
}
