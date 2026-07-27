import { StateGraph, START, END } from "@langchain/langgraph";

import {
  triage,
  afterTriage,
  research,
  writeDraft,
  requestApproval,
} from "../nodes/composeEmail.js";
import { ComposeEmailState } from "../state/index.js";

// Prompt-chaining pipeline; fixed nodes guarantee classify → (research) → draft on every reply.
//
//   triage ──(needs research)──▶ research ──▶ write_draft ──▶ request_approval ──▶ (interrupt)
//      ├────(no research needed)──────────────▶ write_draft
//      └────(email not found)───────────────────────────────────────────────────▶ END
//
// Ends at the interrupt on purpose (CopilotKit resumes with a new run). No own checkpointer —
// a subgraph composed as a node shares the parent's, which lets the interrupt reach the run.
//
// setNodeDefaults isn't inherited from the parent graph, so retries/timeouts for triage,
// research, and write_draft (each one LLM or DB call) are set here too. interrupt() inside
// request_approval bypasses retries entirely, so applying the same defaults to it is harmless.
// A failure that survives these retries bubbles out to the parent's compose_email node, whose
// errorHandler (graphs/index.ts) is the backstop.
const composeEmailWorkflow = new StateGraph(ComposeEmailState)
  .setNodeDefaults({
    retryPolicy: { maxAttempts: 3 },
    timeout: { runTimeout: 45_000 },
  })
  .addNode("triage", triage)
  .addNode("research", research)
  .addNode("write_draft", writeDraft)
  .addNode("request_approval", requestApproval)
  .addEdge(START, "triage")
  .addConditionalEdges("triage", afterTriage, {
    research: "research",
    write_draft: "write_draft",
    __end__: END,
  })
  .addEdge("research", "write_draft")
  .addEdge("write_draft", "request_approval")
  .addEdge("request_approval", END);

export const composeEmailSubgraph = composeEmailWorkflow.compile();
