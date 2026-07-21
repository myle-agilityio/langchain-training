import { z } from "zod";
import { AIMessage, type BaseMessage } from "@langchain/core/messages";
import { zodState } from "@copilotkit/sdk-js/langgraph";
import type { BaseStore, LangGraphRunnableConfig } from "@langchain/langgraph";

import { loadEmails } from "../tools/emails/store.js";

/**
 * Short-term memory, part 2: the carry-over — what this conversation is working on.
 *
 * On its own this would be redundant: which email "it" refers to, and the text of the last
 * draft, are both already in the transcript, and the model resolves them fine from there.
 * It earns its place because of history.ts — once old turns are summarized away and stale
 * inbox dumps are tombstoned, the messages those facts were derivable *from* are no longer in
 * the model's input. This is the small, structured residue that survives that trimming.
 *
 * Thread-scoped on purpose: two threads can be triaging two different emails. Cross-thread
 * facts belong in the Store instead (see tools/emails/store.ts).
 *
 * `zodState` wraps the schema so LangGraph serializes it into the graph's output schema;
 * without it the field is silently dropped from the state snapshots the frontend receives.
 */
export const WorkingContextSchema = zodState(
  z
    .object({
      /** Email the conversation is currently about. */
      emailId: z.string().optional(),
      /** Human-readable "subject" — Sender, so the prompt block reads at a glance. */
      emailLabel: z.string().optional(),
      /** Most recent draft proposed for `emailId`, as the model last wrote it. */
      lastDraft: z.object({ subject: z.string(), body: z.string() }).optional(),
    })
    .default(() => ({})),
);

export type WorkingContext = z.infer<typeof WorkingContextSchema>;

/** Renders the working context as a system-prompt block. Empty when nothing is focused. */
export function renderWorkingContext(context: WorkingContext | undefined): string {
  if (!context?.emailId) return "";

  const lines = [
    "",
    "  Working context for this conversation:",
    `  - Focused email: \`${context.emailId}\`${
      context.emailLabel ? ` — ${context.emailLabel}` : ""
    }`,
  ];

  if (context.lastDraft) {
    lines.push(
      "  - Last draft you proposed for it:",
      `    subject: ${context.lastDraft.subject}`,
      `    body: ${context.lastDraft.body.replace(/\n+/g, " ")}`,
      "",
      "  When asked to change the draft ('shorter', 'less formal', 'drop the apology'), revise",
      "  the draft above and keep everything they didn't ask you to change — don't start over.",
      "  Call compose_reply again with the revised version.",
    );
  }

  lines.push(
    "",
    "  'it', 'that one', 'this email' with no other qualifier mean the focused email — act on it",
    "  directly instead of asking which one. Anything naming a different email replaces the",
    "  focus. Still call get_emails first when you need its current status.",
    "",
  );
  return lines.join("\n");
}

async function labelFor(
  emailId: string,
  store: BaseStore | undefined,
): Promise<string | undefined> {
  if (!store) return undefined;
  const email = (await loadEmails(store)).find((e) => e.id === emailId);
  return email ? `"${email.subject}" from ${email.from.name}` : undefined;
}

/**
 * The `track_context` node: derives working context from the tool calls the model just made.
 *
 * Why derive it here rather than have the tools return `Command` state updates (the pattern
 * the rest of the repo uses): `compose_reply` pauses on `interrupt()`, and CopilotKit answers
 * that pause by starting a *fresh run* rather than replaying the tool to completion (see
 * tools.ts), so a `Command` returned after the interrupt would never land. Deriving from the
 * AI message records the draft the moment the model proposes it — before the approval pause,
 * which is exactly when a later "make it shorter" needs it. Hence this node's position:
 * between the model and the tools, not after them.
 */
export async function trackWorkingContext(
  state: { messages: BaseMessage[]; workingContext?: WorkingContext },
  config: LangGraphRunnableConfig,
) {
  const last = state.messages[state.messages.length - 1];
  if (!AIMessage.isInstance(last) || !last.tool_calls?.length) return {};

  const current = state.workingContext ?? {};
  let emailId = current.emailId;
  let lastDraft = current.lastDraft;
  let draftedNow = false;

  for (const call of last.tool_calls) {
    const args = (call.args ?? {}) as Record<string, unknown>;
    if (call.name === "compose_reply" && typeof args.id === "string") {
      emailId = args.id;
      lastDraft = {
        subject: String(args.subject ?? ""),
        body: String(args.body ?? ""),
      };
      draftedNow = true;
    }
    if (call.name === "manage_emails") {
      // Only a single-email patch is a focus signal — a bulk triage pass isn't "this one".
      const patches = args.patches;
      if (Array.isArray(patches) && patches.length === 1) {
        const id = (patches[0] as { id?: unknown } | undefined)?.id;
        if (typeof id === "string") emailId = id;
      }
    }
  }

  if (emailId === current.emailId && !draftedNow) return {};

  // A draft only ever belongs to the email it was written for, so moving focus drops it.
  if (!draftedNow && emailId !== current.emailId) lastDraft = undefined;

  const emailLabel =
    emailId === current.emailId
      ? current.emailLabel
      : await labelFor(emailId!, config.store);

  return { workingContext: { emailId, emailLabel, lastDraft } };
}
