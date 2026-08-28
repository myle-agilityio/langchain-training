import { getPool } from "./pool";
import type { ChatThread } from "@/types";

interface ChatThreadRow {
  id: string;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

const CHAT_THREAD_COLUMNS = `id, title, created_at, updated_at`;

const toChatThread = (row: ChatThreadRow): ChatThread => {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
};

export const listThreads = async (
  limit: number,
  offset: number,
  userId: string,
  search?: string,
): Promise<{ threads: ChatThread[]; hasNext: boolean }> => {
  // Ask for one extra row — its presence past `limit` is how we know there's another page,
  // without a second COUNT(*) query.
  const where = search
    ? `WHERE user_id = $3 AND (title ILIKE $4 OR content ILIKE $4)`
    : `WHERE user_id = $3`;
  const params = search
    ? [limit + 1, offset, userId, `%${search}%`]
    : [limit + 1, offset, userId];

  const { rows } = await getPool().query<ChatThreadRow>(
    `SELECT ${CHAT_THREAD_COLUMNS} FROM chat_threads ${where} ORDER BY updated_at DESC LIMIT $1 OFFSET $2`,
    params,
  );

  return {
    threads: rows.slice(0, limit).map(toChatThread),
    hasNext: rows.length > limit,
  };
};

// Upsert: creates the row the first time a thread is touched, and just bumps updated_at on
// every later touch. Title never gets clobbered (LLM-generated or teacher-renamed), but content
// is refreshed with the caller's latest full-conversation snapshot every time, so search stays
// current with the whole thread rather than just its first message. COALESCE guards against a
// call that omits content wiping out what's already there.
export const upsertThread = async (
  id: string,
  userId: string,
  title: string | null,
  content: string | null = null,
): Promise<ChatThread> => {
  // ON CONFLICT never touches user_id — a thread keeps its original owner even if re-touched.
  const { rows } = await getPool().query<ChatThreadRow>(
    `INSERT INTO chat_threads (id, user_id, title, content)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       updated_at = now(),
       content = COALESCE(EXCLUDED.content, chat_threads.content)
     RETURNING ${CHAT_THREAD_COLUMNS}`,
    [id, userId, title, content],
  );

  return toChatThread(rows[0]);
};

export const threadExists = async (id: string): Promise<boolean> => {
  const { rows } = await getPool().query<{ id: string }>(
    `SELECT id FROM chat_threads WHERE id = $1`,
    [id],
  );

  return rows.length > 0;
};

export const renameThread = async (
  id: string,
  userId: string,
  title: string,
): Promise<ChatThread | null> => {
  const { rows } = await getPool().query<ChatThreadRow>(
    `UPDATE chat_threads SET title = $3, updated_at = now() WHERE id = $1 AND user_id = $2
     RETURNING ${CHAT_THREAD_COLUMNS}`,
    [id, userId, title],
  );

  return rows[0] ? toChatThread(rows[0]) : null;
};

export const deleteThread = async (
  id: string,
  userId: string,
): Promise<void> => {
  await getPool().query(
    `DELETE FROM chat_threads WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
};
