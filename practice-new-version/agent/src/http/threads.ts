import { Hono } from "hono";
import { MODEL } from "@/config/model";
import {
  ensureThreadsSchema,
  listThreads,
  upsertThread,
  threadExists,
  renameThread,
  deleteThread,
} from "@/db/threads";

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
        model: MODEL,
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

export const threadsApp = new Hono();

threadsApp.get("/", async (c) => {
  await ensureThreadsSchema();
  const threads = await listThreads();
  return c.json({ threads });
});

// Upsert: creates the row (title from firstMessage) on a thread's first touch, else just bumps
// updated_at — never clobbers an existing title (LLM-generated or teacher-renamed).
threadsApp.post("/", async (c) => {
  await ensureThreadsSchema();
  let body: { id: string; firstMessage?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be valid JSON" }, 400);
  }
  const { id, firstMessage } = body;
  if (!id) {
    return c.json({ error: "id is required" }, 400);
  }

  const exists = await threadExists(id);
  // Visitor's own key (BYOK — see agent/src/config/model.ts) first; process.env.OPENAI_API_KEY
  // is only a leftover fallback for as long as it's still set on this deployment.
  const apiKey = c.req.header("x-openai-api-key") ?? process.env.OPENAI_API_KEY;
  // Only spend an LLM call the first time this thread is created, not on every touch.
  const title = exists ? null : await generateTitle(firstMessage, apiKey ?? undefined);

  const thread = await upsertThread(id, title);
  return c.json({ thread });
});

threadsApp.patch("/", async (c) => {
  await ensureThreadsSchema();
  let body: { id: string; title: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be valid JSON" }, 400);
  }
  const { id, title } = body;
  if (!id || !title) {
    return c.json({ error: "id and title are required" }, 400);
  }
  const thread = await renameThread(id, title);
  if (!thread) {
    return c.json({ error: `No thread with id ${id}` }, 404);
  }
  return c.json({ thread });
});

threadsApp.delete("/", async (c) => {
  await ensureThreadsSchema();
  const id = c.req.query("id");
  if (!id) {
    return c.json({ error: "id is required" }, 400);
  }
  await deleteThread(id);
  return c.json({ ok: true });
});
