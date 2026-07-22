import { EmailSchema, type Email } from "./schema.js";
import { seedEmails } from "./seed-data.js";
import { query } from "../../db/index.js";

/**
 * The inbox lives in Postgres (see ../../db/index.ts for why application data goes there while
 * graph checkpoints stay with LangGraph). It used to live in LangGraph's cross-thread Store,
 * which is why these functions no longer take a `BaseStore` — every caller reaches the same
 * database directly, so there's nothing to thread through from the tool runtime.
 *
 * Ordering is the database's job now: `ORDER BY received_at DESC` on an index, rather than
 * sorting the whole mailbox in memory after every read.
 */

interface EmailRow {
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
  reply: unknown;
}

function toEmail(row: EmailRow): Email {
  return EmailSchema.parse({
    id: row.id,
    from: { name: row.from_name, email: row.from_email },
    subject: row.subject,
    body: row.body,
    // The column is timestamptz, so pg hands back a Date; the rest of the app passes
    // receivedAt around as an ISO string.
    receivedAt: row.received_at.toISOString(),
    status: row.status,
    classification: row.topic
      ? {
          topic: row.topic,
          course: row.course,
          workType: row.work_type,
          urgency: row.urgency,
        }
      : undefined,
    reply: row.reply ?? undefined,
  });
}

const SELECT_COLUMNS = `
  id, from_name, from_email, subject, body, received_at, status,
  topic, course, work_type, urgency, reply
`;

/** Writes one email, inserting or overwriting by id. */
async function upsert(email: Email): Promise<void> {
  await query(
    `INSERT INTO emails (${SELECT_COLUMNS})
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (id) DO UPDATE SET
       from_name   = EXCLUDED.from_name,
       from_email  = EXCLUDED.from_email,
       subject     = EXCLUDED.subject,
       body        = EXCLUDED.body,
       received_at = EXCLUDED.received_at,
       status      = EXCLUDED.status,
       topic       = EXCLUDED.topic,
       course      = EXCLUDED.course,
       work_type   = EXCLUDED.work_type,
       urgency     = EXCLUDED.urgency,
       reply       = EXCLUDED.reply`,
    [
      email.id,
      email.from.name,
      email.from.email,
      email.subject,
      email.body,
      email.receivedAt,
      email.status,
      email.classification?.topic ?? null,
      email.classification?.course ?? null,
      email.classification?.workType ?? null,
      email.classification?.urgency ?? null,
      email.reply ? JSON.stringify(email.reply) : null,
    ],
  );
}

export async function loadEmails(): Promise<Email[]> {
  const { rows } = await query<EmailRow>(
    `SELECT ${SELECT_COLUMNS} FROM emails ORDER BY received_at DESC`,
  );
  if (rows.length === 0) {
    // First read against an empty database: seed it so later reads (agent or frontend) aren't
    // empty. ON CONFLICT DO NOTHING keeps two processes racing this from erroring.
    await Promise.all(seedEmails.map(seedIfAbsent));
    return [...seedEmails].sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );
  }
  return rows.map(toEmail);
}

async function seedIfAbsent(email: Email): Promise<void> {
  await query(
    `INSERT INTO emails (${SELECT_COLUMNS})
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (id) DO NOTHING`,
    [
      email.id,
      email.from.name,
      email.from.email,
      email.subject,
      email.body,
      email.receivedAt,
      email.status,
      email.classification?.topic ?? null,
      email.classification?.course ?? null,
      email.classification?.workType ?? null,
      email.classification?.urgency ?? null,
      email.reply ? JSON.stringify(email.reply) : null,
    ],
  );
}

export async function saveEmail(email: Email): Promise<void> {
  await upsert(email);
}

/**
 * Patches the mutable fields of one email. A targeted UPDATE rather than
 * read-modify-write-the-whole-mailbox, which is what this was when the inbox was an
 * in-memory array: COALESCE leaves anything the caller didn't supply untouched, so two
 * concurrent patches to different fields no longer clobber each other.
 *
 * Returns false when no row matched, so callers can tell "unknown id" from "nothing changed".
 */
export async function patchEmail(
  id: string,
  patch: { status?: Email["status"]; classification?: Email["classification"] },
): Promise<boolean> {
  const result = await query(
    `UPDATE emails SET
       status    = COALESCE($2, status),
       topic     = COALESCE($3, topic),
       course    = COALESCE($4, course),
       work_type = COALESCE($5, work_type),
       urgency   = COALESCE($6, urgency)
     WHERE id = $1`,
    [
      id,
      patch.status ?? null,
      patch.classification?.topic ?? null,
      patch.classification?.course ?? null,
      patch.classification?.workType ?? null,
      patch.classification?.urgency ?? null,
    ],
  );
  return (result.rowCount ?? 0) > 0;
}

/** One email by id, without pulling the whole mailbox back to filter it in memory. */
export async function findEmail(id: string): Promise<Email | undefined> {
  const { rows } = await query<EmailRow>(
    `SELECT ${SELECT_COLUMNS} FROM emails WHERE id = $1`,
    [id],
  );
  return rows[0] ? toEmail(rows[0]) : undefined;
}

/**
 * Counting is a known LLM weak spot (verified: it miscounted "11 unread" as 9/10 across
 * repeated tries on the same data), so the breakdown is computed rather than left for the
 * model to derive. It's a GROUP BY now instead of a loop over the whole mailbox.
 */
export async function countsByStatus(): Promise<Record<string, number>> {
  const { rows } = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM emails GROUP BY status`,
  );
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.count)]));
}
