import { StateGraph, START, END } from "@langchain/langgraph";

import {
  triage,
  afterTriage,
  research,
  writeDraft,
  requestApproval,
} from "../nodes/composeEmail.js";
import { ComposeEmailState } from "../state/index.js";

// Prompt-chaining pipeline; fixed nodes guarantee classify → research → draft on every reply.
//
//   triage ──(found)──▶ research ──▶ write_draft ──▶ request_approval ──▶ (interrupt)
//      └────(not found)──────────────────────────────────────────────────▶ END
//
// Ends at the interrupt on purpose (CopilotKit resumes with a new run). No own checkpointer —
// a subgraph composed as a node shares the parent's, which lets the interrupt reach the run.
const composeEmailWorkflow = new StateGraph(ComposeEmailState)
  .addNode("triage", triage)
  .addNode("research", research)
  .addNode("write_draft", writeDraft)
  .addNode("request_approval", requestApproval)
  .addEdge(START, "triage")
  .addConditionalEdges("triage", afterTriage, {
    research: "research",
    __end__: END,
  })
  .addEdge("research", "write_draft")
  .addEdge("write_draft", "request_approval")
  .addEdge("request_approval", END);

export const composeEmailSubgraph = composeEmailWorkflow.compile();
