import { z } from "zod";

import { ClassificationSchema, StatusSchema } from "@/types/index";

const ReplySchema = z.object({
  subject: z.string(),
  body: z.string(),
  sentAt: z.string(),
});

// The enum is what closes the door on a bad status reaching Postgres — a value the schema
// doesn't have can't be written, where a prose rule could only discourage it.
const EmailPatchSchema = z
  .object({
    status: StatusSchema.optional(),
    classification: ClassificationSchema.optional(),
    reply: ReplySchema.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "patch must set at least one field",
  });

// Bulk path — mark all as read/unread from the inbox toolbar. Status-only on purpose: a
// classification/reply patch always targets one specific email, never a batch.
const BulkPatchSchema = z.object({
  ids: z.array(z.string()).min(1),
  patch: z.object({ status: StatusSchema }),
});

const SinglePatchSchema = z.object({
  id: z.string().min(1),
  patch: EmailPatchSchema,
});

export const PatchEmailBodySchema = z.union([
  BulkPatchSchema,
  SinglePatchSchema,
]);
export type PatchEmailBody = z.infer<typeof PatchEmailBodySchema>;

export const SaveThreadBodySchema = z.object({
  id: z.string().min(1),
  firstMessage: z.string().optional(),
});
export type SaveThreadBody = z.infer<typeof SaveThreadBodySchema>;

export const RenameThreadBodySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
});
export type RenameThreadBody = z.infer<typeof RenameThreadBodySchema>;

export const ThreadIdQuerySchema = z.object({ id: z.string().min(1) });
export type ThreadIdQuery = z.infer<typeof ThreadIdQuerySchema>;
