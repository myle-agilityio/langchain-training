import { StateGraph, START, END, type LangGraphRunnableConfig } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { getCheckpointer } from "../db/checkpointer.js";
import { getMemoryStore } from "../db/memoryStore.js";
import {
  afterValidate,
  callModel,
  composeEmailErrorHandler,
  routeAfterModel,
  validateRequest,
} from "../nodes/index.js";
import { ensureIndexed } from "../rag/index.js";
import { AgentState } from "../state/index.js";
import { executableTools } from "../tools/index.js";
import { composeEmailSubgraph } from "./composeEmailSubgraph.js";

// A compiled subgraph passed directly as an addNode action doesn't type-check together with a
// third options argument, so wrap it in a function that does the invoke() call instead.
async function runComposeEmail(state: typeof AgentState.State, config: LangGraphRunnableConfig) {
  return composeEmailSubgraph.invoke(state, config);
}

// Build the email assistant graph: a ReAct loop with the compose-email subgraph as a node.
export async function buildGraph() {
  const workflow = new StateGraph(AgentState)
    .setNodeDefaults({
      retryPolicy: { maxAttempts: 3 },
      timeout: { runTimeout: 60_000 },
    })
    .addNode("validate_request", validateRequest)
    .addNode("call_model", callModel)
    .addNode("tools", new ToolNode(executableTools), { timeout: { runTimeout: 90_000 } })
    .addNode("compose_email", runComposeEmail, { errorHandler: composeEmailErrorHandler })

    .addEdge(START, "validate_request")

    // Out-of-scope request → decline message, end; otherwise into the normal ReAct loop.
    .addConditionalEdges("validate_request", afterValidate, {
      call_model: "call_model",
      __end__: END,
    })

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
