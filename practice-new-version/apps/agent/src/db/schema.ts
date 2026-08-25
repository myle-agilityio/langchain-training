import { getPool } from "./pool";

// Every table the app owns, created once at boot (checkpoints/store/kb_documents are created by
// their own libraries). Idempotent, so a fresh database and an existing one take the same path.
export const ensureSchema = async (): Promise<void> => {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS emails (
      id          text PRIMARY KEY,
      from_name   text        NOT NULL,
      from_email  text        NOT NULL,
      subject     text        NOT NULL,
      body        text        NOT NULL,
      received_at timestamptz NOT NULL,
      status      text        NOT NULL,
      topic       text,
      course      text,
      work_type   text,
      urgency     text,
      reply       jsonb
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS emails_received_at_idx ON emails (received_at DESC)`,
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_threads (
      id         text PRIMARY KEY,
      title      text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
};
