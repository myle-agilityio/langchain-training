import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

/**
 * Postgres connection + schema for the application's own data (the inbox and contact
 * profiles).
 *
 * Why Postgres is only *half* the persistence story here: graph checkpoints still live in
 * LangGraph's own storage, because `@langchain/langgraph-api` (what `langgraph dev` runs)
 * overwrites `compiled.checkpointer`/`compiled.store` on every request — see its
 * `dist/graph/load.mjs`. A `PostgresSaver`/`PostgresStore` passed to `.compile()` is silently
 * discarded, so the documented approach only applies to a self-hosted graph. Application data
 * has no such constraint: it's ours, so it goes straight to Postgres and stops depending on
 * the dev server's JSON files entirely.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The agent process is started by the langgraph CLI, which doesn't load ../../.env for us the
// way the seed script does. Load it here so DATABASE_URL is present however the agent is run.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(path.resolve(__dirname, "../../../.env"));
  } catch {
    // Fall back to whatever is already in the environment.
  }
}

let pool: pg.Pool | undefined;
let ready: Promise<void> | undefined;

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — the inbox lives in Postgres now. Copy .env.example to .env " +
        "and point DATABASE_URL at a database.",
    );
  }
  return url;
}

/**
 * Splits the URL's TLS intent from the rest of the connection string.
 *
 * The params are stripped rather than passed through because node-postgres warns that it
 * currently treats `sslmode=require` as `verify-full` and will adopt libpq's weaker semantics
 * in its next major — so the same URL would silently change behaviour on a dependency bump.
 * Deciding TLS here, from an explicit `ssl` option, pins it either way. `channel_binding` is a
 * libpq option node-postgres doesn't implement at all.
 */
export function poolConfig(url: string): pg.PoolConfig {
  const parsed = new URL(url);
  const sslmode = parsed.searchParams.get("sslmode");
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");

  return {
    connectionString: parsed.toString(),
    // Hosted Postgres (Neon, Supabase) requires TLS but presents a chain node-postgres won't
    // verify by default; without this the connection fails outright. Local databases don't ask
    // for TLS at all, hence keying off the URL rather than always enabling it.
    ssl:
      sslmode && sslmode !== "disable" ? { rejectUnauthorized: false } : undefined,
  };
}

export function getPool(): pg.Pool {
  pool ??= new pg.Pool(poolConfig(connectionString()));
  return pool;
}

/**
 * Idempotent schema creation, awaited before the first query rather than run as a separate
 * migration step: this is a practice project with two tables, and a missing-table error on
 * first run is a worse experience than a no-op `CREATE TABLE IF NOT EXISTS`. Memoized so
 * concurrent callers share one round trip instead of racing.
 */
export function ensureSchema(): Promise<void> {
  ready ??= (async () => {
    await getPool().query(`
      CREATE TABLE IF NOT EXISTS emails (
        id            TEXT PRIMARY KEY,
        from_name     TEXT        NOT NULL,
        from_email    TEXT        NOT NULL,
        subject       TEXT        NOT NULL,
        body          TEXT        NOT NULL,
        received_at   TIMESTAMPTZ NOT NULL,
        status        TEXT        NOT NULL,
        -- The four classification fields are columns rather than one jsonb blob so counting
        -- and grouping ("how many Grade 12 are urgent") is a SQL question. They're written as
        -- a unit, and the CHECK enforces that invariant in the database, mirroring the zod
        -- schema where classification is all-or-nothing.
        topic         TEXT,
        course        TEXT,
        work_type     TEXT,
        urgency       TEXT,
        -- A sent reply is a small, always-read-together value with no query needs of its own.
        reply         JSONB,
        CONSTRAINT classification_all_or_nothing CHECK (
          (topic IS NULL AND course IS NULL AND work_type IS NULL AND urgency IS NULL)
          OR
          (topic IS NOT NULL AND course IS NOT NULL AND work_type IS NOT NULL AND urgency IS NOT NULL)
        )
      );

      CREATE INDEX IF NOT EXISTS emails_received_at_idx ON emails (received_at DESC);

      CREATE TABLE IF NOT EXISTS contact_profiles (
        email      TEXT PRIMARY KEY,
        name       TEXT,
        tone       TEXT,
        facts      JSONB       NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL
      );
    `);
  })();
  return ready;
}

/** Runs a query with the schema guaranteed to exist. */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<pg.QueryResult<T>> {
  await ensureSchema();
  return getPool().query<T>(text, values);
}
