import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";

import { getPgConnectionOptions } from "@/config";

let store: PostgresStore | undefined;

// Cross-thread key-value store (BaseStore), for memory that must outlive a single thread.
export const getMemoryStore = async (): Promise<PostgresStore> => {
  if (!store) {
    store = new PostgresStore({ connectionOptions: getPgConnectionOptions() });
    await store.setup();
  }

  return store;
};
