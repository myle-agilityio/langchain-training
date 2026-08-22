import type { Email } from "@/types/email";
import { apiFetch } from "./client";

const EMAILS_PATH = "/api/emails";

export const fetchEmails = async (): Promise<Email[]> =>
  (await apiFetch<{ emails: Email[] }>(EMAILS_PATH)).emails;

export const patchEmail = async (
  id: string,
  patch: Partial<Email>,
): Promise<Email> =>
  (
    await apiFetch<{ email: Email }>(EMAILS_PATH, {
      method: "PATCH",
      json: { id, patch },
    })
  ).email;

// Bulk sibling of patchEmail — one PATCH for the whole "mark all as read/unread" action
// instead of N racing requests, one per row.
export const patchEmails = async (
  ids: string[],
  patch: Partial<Email>,
): Promise<Email[]> =>
  (
    await apiFetch<{ emails: Email[] }>(EMAILS_PATH, {
      method: "PATCH",
      json: { ids, patch },
    })
  ).emails;
