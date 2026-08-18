import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { FILTER_DESCRIPTION, TOOL } from "@/constants/index";
import { listEmails } from "@/db/index";
import { EmailFilterSchema } from "@/types/index";
import { redactEmailForModel } from "@/utils/index";

export const get_emails = tool(
  async (input: { filter?: z.infer<typeof EmailFilterSchema> }) => {
    const emails = await listEmails(input.filter);
    return JSON.stringify({
      emails: emails.map(redactEmailForModel),
      count: emails.length,
    });
  },
  {
    name: TOOL.GET_EMAILS,
    description:
      "List emails (id, sender, subject, body, status, classification), optionally filtered. " +
      `${FILTER_DESCRIPTION} For any 'how many' question use count_emails instead of counting ` +
      "this array yourself.",
    schema: z.object({ filter: EmailFilterSchema.optional() }),
  },
);
