import { NextResponse } from "next/server";
import {
  CHAT_THREAD_COLUMNS,
  ensureThreadsSchema,
  query,
  toChatThread,
  type ChatThreadRow,
} from "@/lib/db";

// Matches agent/src/config/model.ts's MODEL — same tier CopilotKit Intelligence's own
// auto-titling would use, just called directly since we don't have that platform here.
const TITLE_MODEL = "gpt-4o-mini";

// Best-effort: a title is a nice-to-have, so any failure (missing key, network, rate limit)
// just falls back to a truncated first message rather than blocking thread creation.
async function generateTitle(
  firstMessage: string | undefined,
  apiKey: string | undefined,
): Promise<string | null> {
  const text = firstMessage?.trim();
  if (!text) return null;
  const fallback = text.length > 60 ? `${text.slice(0, 60)}…` : text;

  if (!apiKey) return fallback;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: TITLE_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Write a short chat title (3-6 words) summarizing the user's message. " +
              "No quotes, no trailing punctuation, no prefix like 'Title:'.",
          },
          { role: "user", content: text },
        ],
        max_tokens: 20,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const generated = data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "");
    return generated || fallback;
  } catch {
    return fallback;
  }
}

export async function GET() {
  await ensureThreadsSchema();
  const { rows } = await query<ChatThreadRow>(
    `SELECT ${CHAT_THREAD_COLUMNS} FROM chat_threads ORDER BY updated_at DESC`,
  );
  return NextResponse.json({ threads: rows.map(toChatThread) });
}

// Upsert: creates the row the first time a thread is touched (e.g. a run finalizing on a
// brand-new thread), generating its title from firstMessage — and just bumps updated_at on
// every later touch, without ever clobbering a title (LLM-generated or teacher-renamed).
export async function POST(request: Request) {
  await ensureThreadsSchema();
  const { id, firstMessage } = (await request.json()) as {
    id: string;
    firstMessage?: string;
  };

  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM chat_threads WHERE id = $1`,
    [id],
  );
  // Visitor's own key (BYOK — see agent/src/config/model.ts) first; process.env.OPENAI_API_KEY
  // is only a leftover fallback for as long as it's still set on this deployment.
  const apiKey = request.headers.get("x-openai-api-key") ?? process.env.OPENAI_API_KEY;
  // Only spend an LLM call the first time this thread is created, not on every touch.
  const title = existing.length > 0 ? null : await generateTitle(firstMessage, apiKey ?? undefined);

  const { rows } = await query<ChatThreadRow>(
    `INSERT INTO chat_threads (id, title)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET updated_at = now()
     RETURNING ${CHAT_THREAD_COLUMNS}`,
    [id, title],
  );
  return NextResponse.json({ thread: toChatThread(rows[0]) });
}

export async function PATCH(request: Request) {
  await ensureThreadsSchema();
  const { id, title } = (await request.json()) as { id: string; title: string };
  const { rows } = await query<ChatThreadRow>(
    `UPDATE chat_threads SET title = $2, updated_at = now() WHERE id = $1
     RETURNING ${CHAT_THREAD_COLUMNS}`,
    [id, title],
  );
  if (!rows[0]) {
    return NextResponse.json({ error: `No thread with id ${id}` }, { status: 404 });
  }
  return NextResponse.json({ thread: toChatThread(rows[0]) });
}

export async function DELETE(request: Request) {
  await ensureThreadsSchema();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  await query(`DELETE FROM chat_threads WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
