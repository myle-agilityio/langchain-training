import { z } from "zod";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { ToolMessage, AIMessage } from "@langchain/core/messages";
import { interrupt, type BaseStore } from "@langchain/langgraph";

import { EmailClassificationSchema, type Email } from "./schema.js";
import { searchKnowledgeBase } from "./knowledge-base.js";
import { loadEmails, saveEmail } from "./store.js";

// `ToolRuntime.store` is typed against `@langchain/core`'s generic mget/mset
// BaseStore (core can't depend on langgraph-checkpoint), but the value actually
// injected at runtime is langgraph's namespaced cross-thread BaseStore — see
// store.ts. Cast at the boundary instead of threading `any` through every tool.
function requireStore(runtime: ToolRuntime): BaseStore {
  if (!runtime.store) {
    throw new Error("No store available on this run — cannot access the shared inbox.");
  }
  return runtime.store as unknown as BaseStore;
}

// Counting items out of a JSON dump is a known LLM weak spot (verified: it miscounted
// "11 unread" as 9/10 across repeated tries on the exact same data). Precomputing the
// breakdown here makes counting questions a lookup instead of the model doing arithmetic
// over the array itself.
function summarizeByStatus(emails: Email[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const email of emails) {
    counts[email.status] = (counts[email.status] ?? 0) + 1;
  }
  return counts;
}

export const get_emails = tool(
  async (_input: Record<string, never>, runtime: ToolRuntime) => {
    const emails = await loadEmails(requireStore(runtime));
    return JSON.stringify({
      total: emails.length,
      countsByStatus: summarizeByStatus(emails),
      emails,
    });
  },
  {
    name: "get_emails",
    description:
      "Get the current shared inbox: total count, a countsByStatus breakdown " +
      "(unread/read/replied/bug_filed), and the full email list. For any question " +
      "about how many emails are unread/read/etc., use countsByStatus directly — " +
      "don't count entries in the emails array yourself.",
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

// Patches: subject/body/from/receivedAt are inbox facts the model must never rewrite, so it can only patch the mutable
// status/classification fields by id instead of echoing the whole array back.
export const manage_emails = tool(
  async (
    input: { patches: z.infer<typeof EmailPatchSchema>[] },
    runtime: ToolRuntime,
  ) => {
    const store = requireStore(runtime);
    const current = await loadEmails(store);
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

    await Promise.all(
      updated
        .filter((email) => patchesById.has(email.id))
        .map((email) => saveEmail(store, email)),
    );

    return new ToolMessage({
      content: `Updated ${input.patches.length} email(s).`,
      tool_call_id: runtime.toolCallId,
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

// Pauses via LangGraph's raw `interrupt()` (not LangChain's humanInTheLoopMiddleware)
// so the frontend's useHumanInTheLoop({ name: "compose_reply" }) can render a real card.
//
// We deliberately do NOT use @copilotkit/sdk-js's `copilotKitInterrupt` helper: on
// langgraph 1.4.x, `interrupt()` PAUSES by throwing a `GraphInterrupt`, and that helper
// wraps the call in a try/catch that swallows it and rethrows as CopilotKitMisuseError
// ("Failed to create interrupt"), so the run errors instead of pausing (langgraph's own
// interrupt() docs warn: never catch it without rethrowing). Calling `interrupt()`
// directly lets the GraphInterrupt propagate, so the run interrupts cleanly. We replicate
// the helper's payload shape (__copilotkit_interrupt_value__ / __copilotkit_messages__) so
// the CopilotKit runtime + frontend still recognize it as a `compose_reply` action.
//
// The resume is NOT a true LangGraph Command-resume of this call site — CopilotKit answers
// it by starting a brand-new run with the answer spliced in as context, rather than
// replaying this function to completion. So this tool does the pause + returns the raw
// decision for the model's own conversational context ONLY; EmailReplyCard is the one that
// actually applies the state change — via a PATCH to /api/emails, which writes straight to
// the shared inbox store — the same frontend-mutates-shared-state pattern the todos demo used.
export const compose_reply = tool(
  async (
    input: { id: string; subject: string; body: string },
    runtime: ToolRuntime,
  ) => {
    const current = await loadEmails(requireStore(runtime));
    if (!current.some((e) => e.id === input.id)) {
      return new ToolMessage({
        content: `No email with id ${input.id} — call get_emails first.`,
        tool_call_id: runtime.toolCallId,
      });
    }

    const response = interrupt({
      __copilotkit_interrupt_value__: { action: "compose_reply", args: input },
      __copilotkit_messages__: [
        new AIMessage({
          content: "",
          tool_calls: [
            { id: crypto.randomUUID(), name: "compose_reply", args: input },
          ],
        }),
      ],
    });

    // On resume, `response` is the array of messages CopilotKit splices back in; the
    // human's decision is the content of the last one.
    const answer = Array.isArray(response)
      ? response[response.length - 1]?.content
      : response;

    return new ToolMessage({
      content:
        typeof answer === "string" ? answer : JSON.stringify(answer ?? {}),
      tool_call_id: runtime.toolCallId,
    });
  },
  {
    name: "compose_reply",
    description:
      "Draft a reply to an email by id. This pauses for human approval before " +
      "anything actually sends — call it as soon as the reply is ready, don't " +
      "ask the human separately first.",
    schema: z.object({
      id: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
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
export const email_tools = [
  get_emails,
  manage_emails,
  compose_reply,
  search_knowledge_base,
];
