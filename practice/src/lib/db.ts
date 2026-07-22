import pg from "pg";
import type { Email } from "@/types/email";

/**
 * Postgres access for the Next side. Mirrors agent/src/db + agent/src/tools/emails/store.ts —
 * frontend and agent are separate TS projects with no shared import boundary (same reason
 * src/types/email.ts duplicates the agent's schema), so the mapping is duplicated deliberately
 * rather than reached across the package boundary.
 *
 * Both processes talk to the same database, which is what makes the inbox shared: before this,
 * the frontend reached the inbox through the LangGraph store's REST API, so it depended on the
 * agent server being up just to list emails. Now it doesn't.
 */

// Next's dev server re-evaluates modules on hot reload; without stashing the pool on
// globalThis each reload would leak a fresh connection pool at the database.
const globalForPg = globalThis as unknown as { inboxPool?: pg.Pool };

function getPool(): pg.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — the inbox lives in Postgres. Copy .env.example to .env and " +
        "point DATABASE_URL at a database.",
    );
  }
  // Mirrors agent/src/db/index.ts's poolConfig. sslmode/channel_binding are stripped and TLS
  // decided explicitly, because node-postgres warns it will change how it reads
  // `sslmode=require` in its next major — the same URL would otherwise shift behaviour on a
  // dependency bump.
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
