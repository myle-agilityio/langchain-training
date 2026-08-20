import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

import { getPool } from "./index";

let saver: PostgresSaver | undefined;

// Postgres-backed graph checkpoints, so threads survive an agent restart.
export const getCheckpointer = async (): Promise<PostgresSaver> => {
  if (!saver) {
    saver = new PostgresSaver(getPool());
    await saver.setup();
  }
  return saver;
};
