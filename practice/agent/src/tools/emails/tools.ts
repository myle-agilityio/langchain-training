import { z } from "zod";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";

import { EmailSchema, EmailClassificationSchema, type Email } from "./schema.js";
import { searchKnowledgeBase } from "./knowledge-base.js";

const EmailsStateSchema = z.object({
  emails: z.array(EmailSchema),
});

export const get_emails = tool(
  (
    _input: Record<string, never>,
    runtime: ToolRuntime<typeof EmailsStateSchema>,
  ) => {
    return JSON.stringify(runtime.state.emails ?? []);
  },
  {
    name: "get_emails",
    description: "Get the current shared inbox (all emails and their status).",
    schema: z.object({}),
  },
);

// manage_emails deliberately cannot set "replied" or "bug_filed" — those statuses
// are only reachable via a future finalize tool that runs after human approval, so
// review stays structurally required instead of just prompted (see CLAUDE.md).
const ManageableStatusSchema = z.enum(["unread", "read"]);

const EmailPatchSchema = z.object({
  id: z.string().describe("id of the email to update"),
  status: ManageableStatusSchema.optional(),
  classification: EmailClassificationSchema.optional(),
});

// Patches, not a full-array replace like manage_todos: subject/body/from/receivedAt
// are inbox facts the model must never rewrite, so it can only patch the mutable
// status/classification fields by id instead of echoing the whole array back.
export const manage_emails = tool(
  (
    input: { patches: z.infer<typeof EmailPatchSchema>[] },
    runtime: ToolRuntime<typeof EmailsStateSchema>,
  ) => {
    const current = runtime.state.emails ?? [];
    const patchesById = new Map(input.patches.map((p) => [p.id, p]));

    const updated: Email[] = current.map((email) => {
      const patch = patchesById.get(email.id);
      if (!patch) return email;
      return {
        ...email,
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.classification ? { classification: patch.classification } : {}),
      };
    });

    return new Command({
      update: {
        emails: updated,
        messages: [
          new ToolMessage({
            content: `Updated ${input.patches.length} email(s).`,
            tool_call_id: runtime.toolCallId,
          }),
        ],
      },
    });
  },
  {
    name: "manage_emails",
    description:
      "Patch one or more emails in the shared inbox by id — mark read/unread and/or " +
      "record a classification. Cannot mark an email replied or bug_filed.",
    schema: z.object({ patches: z.array(EmailPatchSchema) }),
  },
);

export const search_knowledge_base = tool(
  (input: { query: string }) => {
    return JSON.stringify(searchKnowledgeBase(input.query));
  },
  {
    name: "search_knowledge_base",
    description:
      "Search internal support articles for context relevant to an email (billing " +
      "policy, known bugs, feature availability, etc.) before drafting a reply.",
    schema: z.object({ query: z.string() }),
  },
);

// Convenience grouping — don't spread this into createAgent's `tools` array.
// TTools' const-generic inference needs each tool passed as a literal array
// element; spreading a pre-typed array widens it and createAgent's overloads
// stop resolving (see agent.ts, which lists the three tools individually).
export const email_tools = [get_emails, manage_emails, search_knowledge_base];
