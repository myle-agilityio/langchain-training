import { z } from "zod";

import { FILTER_DESCRIPTION } from "@/constants";
import { TOOL } from "@repo/constants";
import { aggregateEmails } from "@/db";
import { EmailFilterSchema, EmailGroupBySchema } from "@/types";
import { defineTool } from "./defineTool";

export const count_emails = defineTool({
  run: ({ filter, groupBy }) => aggregateEmails(filter ?? {}, groupBy),
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
});
