import { z } from "zod";

// moderator's structured output: is this chat message unsafe/abusive, distinct from
// SCOPE_GUIDE's capability check and ComplianceCheckSchema's outgoing-draft check.
export const ModerationCheckSchema = z.object({
  flagged: z.boolean(),
  // One short sentence shown to the teacher verbatim; null when flagged is false.
  declineMessage: z.string().nullable(),
});
export type ModerationCheck = z.infer<typeof ModerationCheckSchema>;
