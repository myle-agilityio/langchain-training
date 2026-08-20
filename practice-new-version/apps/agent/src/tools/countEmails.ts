import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { FILTER_DESCRIPTION, TOOL } from "@/constants/index";
import { aggregateEmails } from "@/db/index";
import { EmailFilterSchema, EmailGroupBySchema } from "@/types/index";

export const count_emails = tool(
  async (input: {
    filter?: z.infer<typeof EmailFilterSchema>;
    groupBy?: z.infer<typeof EmailGroupBySchema>;
  }) =>
    JSON.stringify(await aggregateEmails(input.filter ?? {}, input.groupBy)),
  {
    name: TOOL.COUNT_EMAILS,
    description:
      "Count emails matching a filter, without fetching the emails themselves. Always use this " +
      `for 'how many' questions instead of counting get_emails' array. ${FILTER_DESCRIPTION} ` +
      'groupBy splits the count by that field (e.g. groupBy: "status" for a per-status ' +
      "breakdown of the filtered set); omit it for a single total." +
      "When the teacher asks about unreplied emails, they mean anything that is not replied, not just unread ones.",
    schema: z.object({
      filter: EmailFilterSchema.optional(),
      groupBy: EmailGroupBySchema.optional(),
    }),
  },
);
