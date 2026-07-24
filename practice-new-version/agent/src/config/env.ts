import type pg from "pg";

// Read at call time, not import time, so the dev server's env loading always wins.
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — the inbox lives in Postgres. Set it in the root .env.");
  }
  return url;
}

// Strip sslmode/channel_binding and decide TLS explicitly (node-postgres will change how it reads sslmode).
export function getPgConnectionOptions(): pg.PoolConfig {
  const parsed = new URL(getDatabaseUrl());
  const sslmode = parsed.searchParams.get("sslmode");
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");
  return {
    connectionString: parsed.toString(),
    ssl: sslmode && sslmode !== "disable" ? { rejectUnauthorized: false } : undefined,
  };
}
