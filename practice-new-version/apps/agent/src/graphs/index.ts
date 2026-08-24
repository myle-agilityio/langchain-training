import {
  StateGraph,
  START,
  END,
  type LangGraphRunnableConfig,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { getCheckpointer } from "@/db/checkpointer";
import { getMemoryStore } from "@/db/memoryStore";
import { ensureSchema } from "@/db/schema";
import { logError, logInfo } from "@/logging/index";
import {
  afterModeration,
  callModel,
  moderator,
  nodeErrorHandler,
  routeAfterModel,
} from "@/nodes/index";
import { ensureIndexed } from "@/rag/index";
import { AgentState } from "@/state/index";
import { executableTools } from "@/tools/index";
import { composeEmailSubgraph } from "./composeEmailSubgraph";

// A compiled subgraph passed directly as an addNode action doesn't type-check together with a
// third options argument, so wrap it in a function that does the invoke() call instead.
const runComposeEmail = async (
  state: typeof AgentState.State,
  config: LangGraphRunnableConfig,
) => {
  return composeEmailSubgraph.invoke(state, config);
};

// Same wrapping reason as runComposeEmail — a bare ToolNode plus an options argument doesn't
// type-check as a node action.
const toolNode = new ToolNode(executableTools);
const runTools = async (
  state: typeof AgentState.State,
  config: LangGraphRunnableConfig,
) => {
  return toolNode.invoke(state, config);
};

// Build the email assistant graph: a ReAct loop with the compose-email subgraph as a node.
export const buildGraph = async () => {
  const workflow = new StateGraph(AgentState)
    .setNodeDefaults({
      retryPolicy: { maxAttempts: 3 },
      timeout: { runTimeout: 60_000 },
    })
    .addNode("moderator", moderator, {
      errorHandler: nodeErrorHandler("moderator"),
    })
    .addNode("call_model", callModel, {
      errorHandler: nodeErrorHandler("call_model"),
    })
    .addNode("tools", runTools, {
      timeout: { runTimeout: 90_000 },
      errorHandler: nodeErrorHandler("tools"),
    })
    .addNode("compose_email", runComposeEmail, {
      errorHandler: nodeErrorHandler("compose_email"),
    })

    .addEdge(START, "moderator")

    // Flagged message → decline message, end; otherwise into the normal ReAct loop.
    .addConditionalEdges("moderator", afterModeration, {
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

  // Tables first, then the checkpointer/store and the pgvector KB seeded before first search.
  await ensureSchema();
  const [checkpointer, store] = await Promise.all([
    getCheckpointer(),
    getMemoryStore(),
    // Seeding is best-effort: a failure here leaves the KB empty, it doesn't stop the graph.
    ensureIndexed().catch((error) =>
      logError(error, { node: "ensureIndexed" }),
    ),
  ]);
  logInfo("graph.ready");

  return workflow.compile({ checkpointer, store });
};
