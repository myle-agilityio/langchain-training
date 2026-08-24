import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { TOOL } from "@/constants/index";
import { getEmail, updateEmail } from "@/db/index";

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

export const update_email_status = tool(
  async (input: { patches: z.infer<typeof StatusPatchSchema>[] }) => {
    const results = await Promise.all(
      input.patches.map(async (patch) => {
        const current = await getEmail(patch.id);
        if (!current)
          return { id: patch.id, ok: false , error: "no such email" };
        if (current.status === "replied" && patch.status === "unread") {
          return {
            id: patch.id,
            ok: false,
            error: "already replied — a replied email cannot be marked unread",
          };
        }
        const email = await updateEmail(patch.id, { status: patch.status });
        return email
          ? { id: patch.id, ok: true, status: email.status }
          : { id: patch.id, ok: false, error: "no such email" };
      }),
    );
    const failed = results.filter((r) => !r.ok);
    return JSON.stringify({
      results,
      ...(failed.length
        ? {
            recovery:
              "Call get_emails for current ids, then retry the failed patches.",
          }
        : {}),
    });
  },
  {
    name: TOOL.UPDATE_EMAIL_STATUS,
    description:
      "Set status (unread/read/flagged_for_followup) on one or more emails. Batch every email " +
      "into a single call rather than one call each. Cannot mark an email replied: only sending " +
      "a reply does that. A replied email cannot be marked unread.",
    schema: z.object({ patches: z.array(StatusPatchSchema) }),
  },
);
