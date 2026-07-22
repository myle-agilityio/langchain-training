import { NextResponse } from "next/server";
import type { Email } from "@/types/email";
import { seedEmails } from "@/data/seed-emails";
import { EMAIL_COLUMNS, query, toEmail, type EmailRow } from "@/lib/db";

// The inbox lives in Postgres (see agent/src/db/index.ts for why application data goes there
// while graph checkpoints stay with LangGraph). This route talks to that database directly.
// It used to proxy the LangGraph deployment's store REST API, which meant listing emails
// required the agent server to be up; it no longer does.

export async function GET() {
  const { rows } = await query<EmailRow>(
    `SELECT ${EMAIL_COLUMNS} FROM emails ORDER BY received_at DESC`,
  );

  if (rows.length === 0) {
    // First read against an empty database: seed it so later reads (frontend or agent) aren't
    // empty. ON CONFLICT DO NOTHING keeps this safe if the agent seeds concurrently.
    await Promise.all(
      seedEmails.map((email) =>
        query(
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
    return NextResponse.json({
      emails: [...seedEmails].sort(
        (a, b) =>
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
      ),
    });
  }

  return NextResponse.json({ emails: rows.map(toEmail) });
}

export async function PATCH(request: Request) {
  const { id, patch } = (await request.json()) as {
    id: string;
    patch: Partial<Email>;
  };

  // COALESCE leaves anything the caller didn't send untouched, so this is a real partial
  // update rather than a read-modify-write that could clobber a concurrent change. `reply` is
  // the one the approval card sends alongside status: "replied".
  const { rows } = await query<EmailRow>(
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

  if (!rows[0]) {
    return NextResponse.json({ error: `No email with id ${id}` }, { status: 404 });
  }
  return NextResponse.json({ email: toEmail(rows[0]) });
}
