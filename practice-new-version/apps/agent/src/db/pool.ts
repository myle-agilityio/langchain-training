import pg from "pg";

import { getPgConnectionOptions } from "@/config/env";
import { logError } from "@/logging";

// Stashed on globalThis so dev-server reloads don't leak a pool per reload.

const globalForPg = globalThis as unknown as { agentPool?: pg.Pool };

export const getPool = (): pg.Pool => {
  if (!globalForPg.agentPool) {
    const pool = new pg.Pool(getPgConnectionOptions());

    // An idle client dropped by the server emits here — without a listener node exits the process.

    pool.on("error", (error) =>
      logError(error, { detail: "idle pool client" }),
    );

    globalForPg.agentPool = pool;
  }

  return globalForPg.agentPool;
};
