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
  validateRequestErrorHandler,
} from "../nodes/index.js";
import { ensureIndexed } from "../rag/index.js";
import { AgentState } from "../state/index.js";
import { executableTools } from "../tools/index.js";
import { composeEmailSubgraph } from "./composeEmailSubgraph.js";

// A compiled subgraph passed directly as an addNode action doesn't type-check together with a
// third options argument, so this thin wrapper is what actually gets registered — lets
// compose_email take an errorHandler like any other node, with no runtime difference otherwise.
async function runComposeEmail(state: typeof AgentState.State, config: LangGraphRunnableConfig) {
  return composeEmailSubgraph.invoke(state, config);
}

// Build the email assistant graph: a ReAct loop with the compose-email subgraph as a node.
export async function buildGraph() {
  const workflow = new StateGraph(AgentState)
    // Baseline fault tolerance for every node below (retry transient failures like rate limits
    // or network blips; treat a stuck call as failed rather than hanging the run forever).
    // Not inherited by subgraphs — composeEmailSubgraph sets its own defaults.
    .setNodeDefaults({
      retryPolicy: { maxAttempts: 3 },
      timeout: { runTimeout: 60_000 },
    })
    .addNode("validate_request", validateRequest, { errorHandler: validateRequestErrorHandler })
    .addNode("call_model", callModel)
    // handleToolErrors default (true) rethrows GraphInterrupt, so the approval pause survives.
    // Longer timeout than the default: generate_a2ui's generation+recovery loop can run past 60s.
    .addNode("tools", new ToolNode(executableTools), { timeout: { runTimeout: 90_000 } })
    // No retryPolicy override here on purpose: retrying the whole subgraph on a deep failure
    // (e.g. write_draft) would re-run triage/research too, redoing side effects that already
    // succeeded. Retries live on the subgraph's own inner nodes; this errorHandler is the
    // backstop once those are exhausted (interrupt() itself never reaches it — see the handler).
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
