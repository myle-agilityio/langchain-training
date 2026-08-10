import pg from "pg";
import type { Email } from "@/types/email";
import type { ChatThread } from "@/types/thread";

const globalForPg = globalThis as unknown as { inboxPool?: pg.Pool };

function getPool(): pg.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — the inbox lives in Postgres. Copy .env.example to .env and " +
        "point DATABASE_URL at a database.",
    );
  }
  const parsed = new URL(url);
  const sslmode = parsed.searchParams.get("sslmode");
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");

  globalForPg.inboxPool ??= new pg.Pool({
    connectionString: parsed.toString(),
    ssl:
      sslmode && sslmode !== "disable" ? { rejectUnauthorized: false } : undefined,
  });
  return globalForPg.inboxPool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, values);
}

export interface EmailRow {
  id: string;
  from_name: string;
  from_email: string;
  subject: string;
  body: string;
  received_at: Date;
  status: string;
  topic: string | null;
  course: string | null;
  work_type: string | null;
  urgency: string | null;
  reply: Email["reply"] | null;
}

export const EMAIL_COLUMNS = `
  id, from_name, from_email, subject, body, received_at, status,
  topic, course, work_type, urgency, reply
`;

export function toEmail(row: EmailRow): Email {
  return {
    id: row.id,
    from: { name: row.from_name, email: row.from_email },
    subject: row.subject,
    body: row.body,
    receivedAt: row.received_at.toISOString(),
    status: row.status as Email["status"],
    classification: row.topic
      ? {
          topic: row.topic as NonNullable<Email["classification"]>["topic"],
          course: row.course as NonNullable<Email["classification"]>["course"],
          workType: row.work_type as NonNullable<Email["classification"]>["workType"],
          urgency: row.urgency as NonNullable<Email["classification"]>["urgency"],
        }
      : undefined,
    reply: row.reply ?? undefined,
  };
}

export interface ChatThreadRow {
  id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

export const CHAT_THREAD_COLUMNS = `id, title, created_at, updated_at`;

export function toChatThread(row: ChatThreadRow): ChatThread {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

let threadsSchemaReady: Promise<void> | undefined;

// Self-managed thread list, standing in for CopilotKit's Intelligence-only useThreads (see
// NEXT_PUBLIC_COPILOTKIT_THREADS_ENABLED in next.config.ts). Created lazily since, unlike
// `emails`, this table isn't pre-provisioned in the database.
export function ensureThreadsSchema(): Promise<void> {
  threadsSchemaReady ??= query(
    `CREATE TABLE IF NOT EXISTS chat_threads (
       id TEXT PRIMARY KEY,
       title TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  ).then(() => undefined);
  return threadsSchemaReady;
}
