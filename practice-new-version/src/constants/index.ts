import type { EmailStatus } from "@/types/email";

export const STATUS_LABEL: Record<EmailStatus, string> = {
  unread: "Unread",
  read: "Read",
  replied: "Replied",
  flagged_for_followup: "Follow up",
};

export const STATUS_TONE: Record<EmailStatus, string> = {
  unread: "tone-violet",
  read: "tone-blue",
  replied: "tone-green",
  flagged_for_followup: "tone-amber",
};
