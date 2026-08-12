import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";

import { getPgConnectionOptions } from "@/config/env";

let store: PostgresStore | undefined;

// Cross-thread key-value store (BaseStore), for memory that must outlive a single thread.
export async function getMemoryStore(): Promise<PostgresStore> {
  if (!store) {
    store = new PostgresStore({ connectionOptions: getPgConnectionOptions() });
    await store.setup();
  }
  return store;
}
