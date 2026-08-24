import type { EmailStatus } from "@/types/email";

import { TONE } from "./tone";

export const STATUS_LABEL: Record<EmailStatus, string> = {
  unread: "Unread",
  read: "Read",
  replied: "Replied",
  flagged_for_followup: "Follow up",
};

export const STATUS_TONE: Record<EmailStatus, string> = {
  unread: TONE.violet,
  read: TONE.blue,
  replied: TONE.green,
  flagged_for_followup: TONE.amber,
};
