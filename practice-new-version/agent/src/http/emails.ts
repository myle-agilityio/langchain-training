import { Hono } from "hono";
import type { Email } from "../types/index.js";
import { listEmailsSeeded, updateEmailsStatus, patchEmail } from "../db/inbox.js";

export const emailsApp = new Hono();

emailsApp.get("/", async (c) => {
  const emails = await listEmailsSeeded();
  return c.json({ emails });
});

emailsApp.patch("/", async (c) => {
  const body = (await c.req.json()) as
    | { ids: string[]; patch: Partial<Email> }
    | { id: string; patch: Partial<Email> };

  // Bulk path — mark all as read/unread from the inbox toolbar. Status-only on purpose: a
  // classification/reply patch always targets one specific email, never a batch.
  if ("ids" in body) {
    const { ids, patch } = body;
    const emails = await updateEmailsStatus(ids, patch.status as string);
    return c.json({ emails });
  }

  const { id, patch } = body;
  const email = await patchEmail(id, patch);
  if (!email) {
    return c.json({ error: `No email with id ${id}` }, 404);
  }
  return c.json({ email });
});
