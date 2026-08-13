import type pg from "pg";

// Read at call time, not import time, so the dev server's env loading always wins.
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — the inbox lives in Postgres. Set it in the root .env.");
  }
  return url;
}

// Cosine similarity (0-1, higher = more relevant) a KB match must clear to be used as grounding.
// 0.65 default: text-embedding-3-small puts on-topic KB matches around 0.7-0.8 and off-topic
// queries around 0.55-0.6 against this KB (measured directly against the seeded articles).
export function getRagScoreThreshold(): number {
  const raw = Number(process.env.RAG_SCORE_THRESHOLD);
  return Number.isFinite(raw) ? raw : 0.65;
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
