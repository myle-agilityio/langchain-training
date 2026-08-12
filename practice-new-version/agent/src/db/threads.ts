import { getPool } from "./index.js";
import type { ChatThread } from "@/types/thread.js";

interface ChatThreadRow {
  id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

const CHAT_THREAD_COLUMNS = `id, title, created_at, updated_at`;

function toChatThread(row: ChatThreadRow): ChatThread {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

let threadsSchemaReady: Promise<void> | undefined;

// Self-managed thread list, standing in for CopilotKit's Intelligence-only useThreads. Created
// lazily since, unlike `emails`, this table isn't pre-provisioned in the database.
export function ensureThreadsSchema(): Promise<void> {
  threadsSchemaReady ??= getPool()
    .query(
      `CREATE TABLE IF NOT EXISTS chat_threads (
         id TEXT PRIMARY KEY,
         title TEXT,
         created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
         updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    )
    .then(() => undefined);
  return threadsSchemaReady;
}

export async function listThreads(): Promise<ChatThread[]> {
  const { rows } = await getPool().query<ChatThreadRow>(
    `SELECT ${CHAT_THREAD_COLUMNS} FROM chat_threads ORDER BY updated_at DESC`,
  );
  return rows.map(toChatThread);
}

// Upsert: creates the row the first time a thread is touched, and just bumps updated_at on
// every later touch, without ever clobbering a title (LLM-generated or teacher-renamed).
export async function upsertThread(id: string, title: string | null): Promise<ChatThread> {
  const { rows } = await getPool().query<ChatThreadRow>(
    `INSERT INTO chat_threads (id, title)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET updated_at = now()
     RETURNING ${CHAT_THREAD_COLUMNS}`,
    [id, title],
  );
  return toChatThread(rows[0]);
}

export async function threadExists(id: string): Promise<boolean> {
  const { rows } = await getPool().query<{ id: string }>(
    `SELECT id FROM chat_threads WHERE id = $1`,
    [id],
  );
  return rows.length > 0;
}

export async function renameThread(id: string, title: string): Promise<ChatThread | null> {
  const { rows } = await getPool().query<ChatThreadRow>(
    `UPDATE chat_threads SET title = $2, updated_at = now() WHERE id = $1
     RETURNING ${CHAT_THREAD_COLUMNS}`,
    [id, title],
  );
  return rows[0] ? toChatThread(rows[0]) : null;
}

export async function deleteThread(id: string): Promise<void> {
  await getPool().query(`DELETE FROM chat_threads WHERE id = $1`, [id]);
}
