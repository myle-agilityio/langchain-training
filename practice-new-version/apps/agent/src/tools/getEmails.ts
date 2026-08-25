import { z } from "zod";

import { FILTER_DESCRIPTION, TOOL } from "@/constants/index";
import { listEmails } from "@/db/index";
import { EmailFilterSchema } from "@/types/index";
import { redactEmailForModel } from "@/utils/index";
import { defineTool } from "./defineTool";

export const get_emails = defineTool({
  run: async ({ filter }) => {
    const emails = await listEmails(filter);
    return { emails: emails.map(redactEmailForModel), count: emails.length };
  },
  name: TOOL.GET_EMAILS,
  description:
    "List emails (id, sender, subject, body, status, classification) by the filter criteria. " +
    `${FILTER_DESCRIPTION} For any 'how many' question use count_emails instead of counting ` +
    "this array yourself. No need to list the emails in your reply — the result renders as a" +
    "card listing sender and subject per email.",
  schema: z.object({ filter: EmailFilterSchema.optional() }),
});
