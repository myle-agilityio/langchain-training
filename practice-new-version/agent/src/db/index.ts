import pg from "pg";

import { getPgConnectionOptions } from "@/config/env";
import type {
  Classification,
  Email,
  EmailFilter,
  EmailGroupBy,
} from "@/types/index";

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
// Alias kept short for the query strings below.
const COLUMNS = EMAIL_COLUMNS;

// Stashed on globalThis so dev-server reloads don't leak a pool per reload.
const globalForPg = globalThis as unknown as { agentPool?: pg.Pool };

export function getPool(): pg.Pool {
  globalForPg.agentPool ??= new pg.Pool(getPgConnectionOptions());
  return globalForPg.agentPool;
}

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
          topic: row.topic as Classification["topic"],
          course: row.course as Classification["course"],
          workType: row.work_type as Classification["workType"],
          urgency: row.urgency as Classification["urgency"],
        }
      : undefined,
    reply: row.reply ?? undefined,
  };
}

// Maps filter/groupBy keys (camelCase, matching Classification) to their DB columns.
const FILTER_COLUMNS = {
  status: "status",
  topic: "topic",
  course: "course",
  workType: "work_type",
  urgency: "urgency",
} as const;

// Shared by listEmails and aggregateEmails so a filter means the same thing in both.
function buildWhere(filter: EmailFilter): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.id) {
    params.push(filter.id);
    conditions.push(`id = $${params.length}`);
  }
  for (const key of ["status", "topic", "course", "workType", "urgency"] as const) {
    const value = filter[key];
    if (value !== undefined) {
      params.push(value);
      conditions.push(`${FILTER_COLUMNS[key]} = $${params.length}`);
    }
  }
  if (filter.unclassified) conditions.push(`topic IS NULL`);
  if (filter.sender) {
    params.push(`%${filter.sender}%`);
    conditions.push(`(from_name ILIKE $${params.length} OR from_email ILIKE $${params.length})`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(`(subject ILIKE $${params.length} OR body ILIKE $${params.length})`);
  }
  if (filter.receivedAfter) {
    params.push(filter.receivedAfter);
    conditions.push(`received_at >= $${params.length}`);
  }
  if (filter.receivedBefore) {
    params.push(filter.receivedBefore);
    conditions.push(`received_at <= $${params.length}`);
  }

  return { clause: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

export async function listEmails(filter: EmailFilter = {}): Promise<Email[]> {
  const { clause, params } = buildWhere(filter);
  const { rows } = await getPool().query<EmailRow>(
    `SELECT ${COLUMNS} FROM emails ${clause} ORDER BY received_at DESC`,
    params,
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

// Counted in SQL so the model never tallies get_emails' array itself. groupBy splits the
// filtered count by that field; unclassified rows group under "unclassified" rather than null.
export async function aggregateEmails(
  filter: EmailFilter,
  groupBy?: EmailGroupBy,
): Promise<{ total: number; byGroup?: Record<string, number> }> {
  const { clause, params } = buildWhere(filter);

  if (!groupBy) {
    const { rows } = await getPool().query<{ n: string }>(
      `SELECT count(*) AS n FROM emails ${clause}`,
      params,
    );
    return { total: Number(rows[0].n) };
  }

  const column = FILTER_COLUMNS[groupBy];
  const { rows } = await getPool().query<{ group_value: string | null; n: string }>(
    `SELECT ${column} AS group_value, count(*) AS n FROM emails ${clause} GROUP BY ${column}`,
    params,
  );
  const byGroup = Object.fromEntries(
    rows.map((r) => [r.group_value ?? "unclassified", Number(r.n)]),
  );
  return { total: rows.reduce((sum, r) => sum + Number(r.n), 0), byGroup };
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

