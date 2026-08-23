import type { Email } from "@/types/email";
import { apiClient } from "./client";

const EMAILS_PATH = "/api/emails";

export const fetchEmails = async (): Promise<Email[]> =>
  (await apiClient.get<{ emails: Email[] }>(EMAILS_PATH)).data.emails;

export const patchEmail = async (
  id: string,
  patch: Partial<Email>,
): Promise<Email> =>
  (await apiClient.patch<{ email: Email }>(EMAILS_PATH, { id, patch })).data
    .email;

// Bulk sibling of patchEmail — one PATCH for the whole "mark all as read/unread" action
// instead of N racing requests, one per row.
export const patchEmails = async (
  ids: string[],
  patch: Partial<Email>,
): Promise<Email[]> =>
  (await apiClient.patch<{ emails: Email[] }>(EMAILS_PATH, { ids, patch })).data
    .emails;
