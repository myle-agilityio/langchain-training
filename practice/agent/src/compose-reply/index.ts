import { StateGraph, START, END } from "@langchain/langgraph";

import { ComposeReplyState } from "./state.js";
import {
  triage,
  afterTriage,
  research,
  draft,
  requestApproval,
} from "./nodes.js";

/**
 * The compose-reply subgraph: a deterministic prompt-chaining pipeline that replaces the old
 * model-driven "manage_emails → search_knowledge_base → compose_reply" dance. The model kept
 * skipping classify and KB-search (measured: KB 0/4 on a bare request, classify 2/5 before a
 * guard); making them fixed nodes guarantees the sequence every time.
 *
 *   triage ──(found)──▶ research ──▶ draft ──▶ request_approval ──▶ (interrupt)
 *      └────(not found)────────────────────────────────────────────▶ END
 *
 * It ends at the approval interrupt on purpose: CopilotKit resumes an interrupt by starting a
 * new run rather than replaying the graph, so any node after the interrupt would be dead code.
 * The send itself is applied by the frontend (EmailReplyCard → PATCH /api/emails).
 *
 * Compiled here and composed into the main graph as a single node (agent.ts). It is NOT given
 * its own checkpointer — a subgraph added as a node shares the parent's, which is what lets the
 * interrupt propagate to the top-level run.
 */
export const composeReplySubgraph = new StateGraph(ComposeReplyState)
  // Node keys must not collide with state channel names — "draft" is a channel, so the node
  // that writes it is "write_draft".
  .addNode("triage", triage)
  .addNode("research", research)
  .addNode("write_draft", draft)
  .addNode("request_approval", requestApproval)
  .addEdge(START, "triage")
  .addConditionalEdges("triage", afterTriage, ["research", END])
  .addEdge("research", "write_draft")
  .addEdge("write_draft", "request_approval")
  .addEdge("request_approval", END)
  .compile();

export { reply_to_email } from "./nodes.js";
