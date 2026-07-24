import pg from "pg";

import { getPgConnectionOptions } from "../config/env.js";
import type { Classification, ContactProfile, Email } from "../types/index.js";

// Same database the Next side reads (src/lib/db.ts) — that's what makes the inbox shared.

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
  reply: Email["reply"] | null;
}

const COLUMNS = `
  id, from_name, from_email, subject, body, received_at, status,
  topic, course, work_type, urgency, reply
`;

// Stashed on globalThis so dev-server reloads don't leak a pool per reload.
const globalForPg = globalThis as unknown as { agentPool?: pg.Pool };

export function getPool(): pg.Pool {
  globalForPg.agentPool ??= new pg.Pool(getPgConnectionOptions());
  return globalForPg.agentPool;
}

function toEmail(row: EmailRow): Email {
  return {
    id: row.id,
    from: { name: row.from_name, email: row.from_email },
    subject: row.subject,
    body: row.body,
    receivedAt: row.received_at.toISOString(),
    status: row.status as Email["status"],
    classification: row.topic
      ? {
          topic: row.topic as Classification["topic"],
          course: row.course as Classification["course"],
          workType: row.work_type as Classification["workType"],
          urgency: row.urgency as Classification["urgency"],
        }
      : undefined,
    reply: row.reply ?? undefined,
  };
}

export async function listEmails(): Promise<Email[]> {
  const { rows } = await getPool().query<EmailRow>(
    `SELECT ${COLUMNS} FROM emails ORDER BY received_at DESC`,
  );
  return rows.map(toEmail);
}

export async function getEmail(id: string): Promise<Email | null> {
  const { rows } = await getPool().query<EmailRow>(
    `SELECT ${COLUMNS} FROM emails WHERE id = $1`,
    [id],
  );
  return rows[0] ? toEmail(rows[0]) : null;
}

// Counted in SQL so the model never tallies an array itself.
export async function countsByStatus(): Promise<Record<string, number>> {
  const { rows } = await getPool().query<{ status: string; n: string }>(
    `SELECT status, count(*) AS n FROM emails GROUP BY status`,
  );
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
}

// COALESCE keeps unsent fields untouched — a real partial update.
export async function updateEmail(
  id: string,
  patch: { status?: string; classification?: Classification },
): Promise<Email | null> {
  const { rows } = await getPool().query<EmailRow>(
    `UPDATE emails SET
       status    = COALESCE($2, status),
       topic     = COALESCE($3, topic),
       course    = COALESCE($4, course),
       work_type = COALESCE($5, work_type),
       urgency   = COALESCE($6, urgency)
     WHERE id = $1
     RETURNING ${COLUMNS}`,
    [
      id,
      patch.status ?? null,
      patch.classification?.topic ?? null,
      patch.classification?.course ?? null,
      patch.classification?.workType ?? null,
      patch.classification?.urgency ?? null,
    ],
  );
  return rows[0] ? toEmail(rows[0]) : null;
}

// Long-term memory about a sender, read by the compose research node.
export async function getContactProfile(
  email: string,
): Promise<ContactProfile | null> {
  const { rows } = await getPool().query<ContactProfile>(
    `SELECT email, name, tone, facts FROM contact_profiles WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}
