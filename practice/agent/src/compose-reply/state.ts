import { z } from "zod";
import { StateSchema } from "@langchain/langgraph";
import { CopilotKitStateSchema, zodState } from "@copilotkit/sdk-js/langgraph";

import { WorkingContextSchema } from "../memory/index.js";

/**
 * State for the compose-reply subgraph.
 *
 * Two kinds of channel, following LangGraph's prompt-chaining shape (each node's output feeds
 * the next):
 *  - SHARED with the parent graph, by identical key + schema, so direct composition
 *    (`.addNode("compose_reply", subgraph)`) maps them automatically: `messages` (to read the
 *    reply_to_email tool call and answer it) and `workingContext` (to record the draft for a
 *    later "make it shorter"). `...CopilotKitStateSchema.fields` brings `messages` in with the
 *    exact reducer the parent uses, so the channels are compatible.
 *  - PRIVATE to the subgraph — the pipeline's intermediate results. They don't exist on the
 *    parent, so they never leak upward; they're reset on each entry into the subgraph.
 */

export const ComposeReplyDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});
export type ComposeReplyDraft = z.infer<typeof ComposeReplyDraftSchema>;

export const ComposeReplyState = new StateSchema({
  ...CopilotKitStateSchema.fields,
  workingContext: WorkingContextSchema,
  // Private channels. zodState-wrapped like every other StateSchema field so LangGraph gets the
  // json-schema it needs; they aren't shared with the parent, so they reset on each entry.
  /** Which email the pipeline is replying to; "" means triage found no such email. */
  emailId: zodState(z.string().default(() => "")),
  /** Knowledge-base articles found for this email, stringified for the draft prompt. */
  kbContext: zodState(z.string().default(() => "")),
  /** The draft produced by the draft node, handed to the approval interrupt. */
  draft: zodState(ComposeReplyDraftSchema.optional()),
});
