import { getPool, EMAIL_COLUMNS, toEmail, type EmailRow } from "./index.js";
import type { Email } from "@/types/index.js";
import { seedEmails } from "@/data/seed-emails.js";

// Queries used by the HTTP inbox routes (agent/src/http/emails.ts) — distinct from the
// graph-tool queries above since these need shapes (bulk status update, reply patch, seeding)
// the tools never do.

export async function listEmailsSeeded(): Promise<Email[]> {
  const { rows } = await getPool().query<EmailRow>(
    `SELECT ${EMAIL_COLUMNS} FROM emails ORDER BY received_at DESC`,
  );
  if (rows.length === 0) {
    await Promise.all(
      seedEmails.map((email) =>
        getPool().query(
          `INSERT INTO emails (${EMAIL_COLUMNS})
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
        ),
      ),
    );
    return [...seedEmails].sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );
  }
  return rows.map(toEmail);
}

export async function updateEmailsStatus(ids: string[], status: string): Promise<Email[]> {
  const { rows } = await getPool().query<EmailRow>(
    `UPDATE emails SET status = $1 WHERE id = ANY($2::text[]) RETURNING ${EMAIL_COLUMNS}`,
    [status, ids],
  );
  return rows.map(toEmail);
}

export async function patchEmail(id: string, patch: Partial<Email>): Promise<Email | null> {
  const { rows } = await getPool().query<EmailRow>(
    `UPDATE emails SET
       status    = COALESCE($2, status),
       topic     = COALESCE($3, topic),
       course    = COALESCE($4, course),
       work_type = COALESCE($5, work_type),
       urgency   = COALESCE($6, urgency),
       reply     = COALESCE($7::jsonb, reply)
     WHERE id = $1
     RETURNING ${EMAIL_COLUMNS}`,
    [
      id,
      patch.status ?? null,
      patch.classification?.topic ?? null,
      patch.classification?.course ?? null,
      patch.classification?.workType ?? null,
      patch.classification?.urgency ?? null,
      patch.reply ? JSON.stringify(patch.reply) : null,
    ],
  );
  return rows[0] ? toEmail(rows[0]) : null;
}
