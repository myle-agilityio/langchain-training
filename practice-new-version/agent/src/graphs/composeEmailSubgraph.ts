import { StateGraph, START, END } from "@langchain/langgraph";

import {
  triage,
  afterTriage,
  research,
  writeDraft,
  checkCompliance,
  requestApproval,
} from "@/nodes/composeEmail.js";
import { ComposeEmailState } from "@/state/index.js";

// Prompt-chaining pipeline; fixed nodes guarantee classify → (research) → draft → compliance
// check on every reply.
//
//   triage ──(needs research)──▶ research ──▶ write_draft ──▶ check_compliance ──▶ request_approval ──▶ (interrupt)
//      ├────(no research needed)──────────────▶ write_draft
//      └────(email not found)───────────────────────────────────────────────────▶ END
const composeEmailWorkflow = new StateGraph(ComposeEmailState)
  .setNodeDefaults({
    retryPolicy: { maxAttempts: 3 },
    timeout: { runTimeout: 45_000 },
  })
  .addNode("triage", triage)
  .addNode("research", research)
  .addNode("write_draft", writeDraft)
  .addNode("check_compliance", checkCompliance)
  .addNode("request_approval", requestApproval)
  .addEdge(START, "triage")
  .addConditionalEdges("triage", afterTriage, {
    research: "research",
    write_draft: "write_draft",
    __end__: END,
  })
  .addEdge("research", "write_draft")
  .addEdge("write_draft", "check_compliance")
  .addEdge("check_compliance", "request_approval")
  .addEdge("request_approval", END);

export const composeEmailSubgraph = composeEmailWorkflow.compile();
