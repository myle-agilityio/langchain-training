import { z } from "zod";

import { TOOL } from "@/constants";
import { getEmail, updateEmail } from "@/db";
import { AppError, ERROR_CODE, ERRORS } from "@/errors";
import type { Email, ToolError } from "@/types";
import { defineTool, toolError } from "./defineTool";

// Omitting "replied" makes "mark it replied" unreachable — only a sent reply sets that.
const ManageableStatusSchema = z.enum([
  "unread",
  "read",
  "flagged_for_followup",
]);

const StatusPatchSchema = z.object({
  id: z.string(),
  status: ManageableStatusSchema,
});

type StatusResult =
  | { id: string; ok: true; status: Email["status"] }
  | { id: string; ok: false; error: ToolError };

const applyPatch = async (
  patch: z.infer<typeof StatusPatchSchema>,
): Promise<StatusResult> => {
  try {
    const current = await getEmail(patch.id);

    if (!current) {
      throw new AppError(ERROR_CODE.EMAIL_NOT_FOUND);
    }

    if (current.status === "replied" && patch.status === "unread") {
      throw new AppError(ERROR_CODE.STATUS_TRANSITION_INVALID);
    }

    const email = await updateEmail(patch.id, { status: patch.status });

    if (!email) {
      throw new AppError(ERROR_CODE.EMAIL_NOT_FOUND);
    }

    return { id: patch.id, ok: true, status: email.status };
  } catch (error) {
    // Per-item failure, so the rest of the batch still lands. Anything unexpected rethrows and
    // the defineTool wrapper turns the whole call into one logged envelope.
    if (!(error instanceof AppError) || !error.expected) {
      throw error;
    }

    return { id: patch.id, ok: false, error: toolError(error) };
  }
};

export const update_email_status = defineTool({
  run: async ({ patches }) => {
    const results = await Promise.all(patches.map(applyPatch));
    const failed = results.filter((r) => !r.ok);

    return {
      results,
      ...(failed.length
        ? { recovery: ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].recovery }
        : {}),
    };
  },
  name: TOOL.UPDATE_EMAIL_STATUS,
  description:
    "Set status (unread/read/flagged_for_followup) on one or more emails. Batch every email " +
    "into a single call rather than one call each. Cannot mark an email replied: only sending " +
    "a reply does that. A replied email cannot be marked unread.",
  schema: z.object({ patches: z.array(StatusPatchSchema) }),
});
