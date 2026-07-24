import { StateGraph, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { getCheckpointer } from "../db/checkpointer.js";
import { getMemoryStore } from "../db/memoryStore.js";
import { callModel, routeAfterModel } from "../nodes/index.js";
import { ensureIndexed } from "../rag/index.js";
import { AgentState } from "../state/index.js";
import { executableTools } from "../tools/index.js";
import { composeEmailSubgraph } from "./composeEmailSubgraph.js";

// Build the email assistant graph: a ReAct loop with the compose-email subgraph as a node.
export async function buildGraph() {
  const workflow = new StateGraph(AgentState)
    .addNode("call_model", callModel)
    // handleToolErrors default (true) rethrows GraphInterrupt, so the approval pause survives.
    .addNode("tools", new ToolNode(executableTools))
    .addNode("compose_email", composeEmailSubgraph)

    .addEdge(START, "call_model")

    // reply_to_email → subgraph; backend tool → tools; frontend tool or plain answer → end.
    .addConditionalEdges("call_model", routeAfterModel, {
      tools: "tools",
      compose_email: "compose_email",
      __end__: END,
    })

    .addEdge("tools", "call_model")
    // Only traversed when triage found no email; a successful draft pauses at the interrupt.
    .addEdge("compose_email", "call_model");

  // Postgres checkpointer + store, and the pgvector KB seeded before first search.
  const [checkpointer, store] = await Promise.all([
    getCheckpointer(),
    getMemoryStore(),
    ensureIndexed(),
  ]);

  return workflow.compile({ checkpointer, store });
}

export const graph = await buildGraph();
