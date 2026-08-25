import { StateGraph, START, END } from "@langchain/langgraph";

import {
  triage,
  afterTriage,
  research,
  writeDraft,
  checkCompliance,
  requestApproval,
} from "@/nodes";
import { ComposeEmailState } from "@/state";

// Prompt-chaining pipeline: triage → (research?) → write_draft → check_compliance →
// request_approval → interrupt. Skips research when unneeded; ends early if not found.
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
