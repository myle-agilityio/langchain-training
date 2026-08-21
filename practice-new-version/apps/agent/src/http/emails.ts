import { Hono } from "hono";
import type { Email } from "@/types/index";
import { listEmailsSeeded, updateEmailsStatus, patchEmail } from "@/db/inbox";

export const emailsApp = new Hono();

emailsApp.get("/", async (c) => {
  const emails = await listEmailsSeeded();
  return c.json({ emails });
});

emailsApp.patch("/", async (c) => {
  let body:
    | { ids: string[]; patch: Partial<Email> }
    | { id: string; patch: Partial<Email> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Request body must be valid JSON" }, 400);
  }
  if (typeof body !== "object" || body === null) {
    return c.json({ error: "Request body must be a JSON object" }, 400);
  }

  // Bulk path — mark all as read/unread from the inbox toolbar. Status-only on purpose: a
  // classification/reply patch always targets one specific email, never a batch.
  if ("ids" in body) {
    const { ids, patch } = body;
    if (!Array.isArray(ids) || ids.length === 0 || !patch?.status) {
      return c.json(
        {
          error:
            "Bulk patch requires a non-empty `ids` array and a `patch.status`",
        },
        400,
      );
    }
    const emails = await updateEmailsStatus(ids, patch.status as string);
    return c.json({ emails });
  }

  const { id, patch } = body;
  if (!id || !patch) {
    return c.json({ error: "Patch requires an `id` and a `patch`" }, 400);
  }
  const email = await patchEmail(id, patch);
  if (!email) {
    return c.json({ error: `No email with id ${id}` }, 404);
  }
  return c.json({ email });
});
