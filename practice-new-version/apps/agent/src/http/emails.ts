import { Hono } from "hono";

import { listEmailsSeeded, updateEmailsStatus, patchEmail } from "@/db/inbox";
import { AppError, ERROR_CODE } from "@/errors/index";
import { validate } from "./middleware/validate";
import { PatchEmailBodySchema, type PatchEmailBody } from "./schemas";
import type { AppEnv } from "./types";

export const emailsApp = new Hono<AppEnv>();

emailsApp.get("/", async (c) => {
  return c.json({ emails: await listEmailsSeeded() });
});

emailsApp.patch("/", validate("json", PatchEmailBodySchema), async (c) => {
  const body = c.get("valid") as PatchEmailBody;

  if ("ids" in body) {
    const emails = await updateEmailsStatus(body.ids, body.patch.status);
    return c.json({ emails });
  }

  const email = await patchEmail(body.id, body.patch);
  if (!email) {
    throw new AppError(ERROR_CODE.EMAIL_NOT_FOUND, {
      detail: `no email with id ${body.id}`,
    });
  }
  return c.json({ email });
});
