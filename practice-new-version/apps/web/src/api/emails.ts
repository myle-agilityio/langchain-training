import { EMAILS_PAGE_SIZE } from "@/constants";
import type { Email } from "@/types";
import { apiClient } from "./client";

const EMAILS_PATH = "/api/emails";

export interface EmailsPage {
  emails: Email[];
  hasNext: boolean;
}

export const fetchEmails = async (offset: number): Promise<EmailsPage> =>
  (
    await apiClient.get<EmailsPage>(EMAILS_PATH, {
      params: { limit: EMAILS_PAGE_SIZE, offset },
    })
  ).data;

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
