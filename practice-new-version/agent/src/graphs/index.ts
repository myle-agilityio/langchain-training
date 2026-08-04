import { z } from "zod";
import { ToolMessage } from "@langchain/core/messages";
import { Command, isGraphBubbleUp, StateGraph, START, END, type LangGraphRunnableConfig } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

import { getCheckpointer } from "../db/checkpointer.js";
import { afterValidate, callModel, routeAfterModel, validateRequest } from "../nodes/index.js";
import { ensureIndexed } from "../rag/index.js";
import { AgentState } from "../state/index.js";
import { executableTools } from "../tools/index.js";
import { findReplyCall } from "../utils/index.js";
import { composeEmailSubgraph } from "./composeEmailSubgraph.js";

const COMPOSE_EMAIL_ATTEMPTS = 3;

// A compiled subgraph passed directly as an addNode action doesn't type-check together with a
// third options argument, so wrap it in a function that does the invoke() call instead. Retries
// the whole subgraph itself (StateGraph has no per-node error hook to fall back to) — after
// exhausting attempts, answers the dangling reply_to_email call so the model can recover.
async function runComposeEmail(state: z.infer<typeof AgentState>, config: LangGraphRunnableConfig) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= COMPOSE_EMAIL_ATTEMPTS; attempt++) {
    try {
      return await composeEmailSubgraph.invoke(state, config);
    } catch (error) {
      // Interrupts and parent commands bubble up by design — never retry or swallow them.
      if (isGraphBubbleUp(error)) throw error;
      lastError = error;
    }
  }
  console.error(`[compose_email] failed after ${COMPOSE_EMAIL_ATTEMPTS} attempts:`, lastError);
  const call = findReplyCall(state.messages);
  return new Command({
    update: {
      messages: call
        ? [
            new ToolMessage({
              tool_call_id: call.id ?? "unknown",
              content:
                "Drafting failed unexpectedly. Tell the teacher in one short line that the draft " +
                "couldn't be prepared and to try again.",
            }),
          ]
        : [],
    },
    goto: END,
  });
}

const retryPolicy = { maxAttempts: 3 };

// Build the email assistant graph: a ReAct loop with the compose-email subgraph as a node.
export async function buildGraph() {
  const workflow = new StateGraph(AgentState)
    .addNode("validate_request", validateRequest, { retryPolicy })
    .addNode("call_model", callModel, { retryPolicy })
    .addNode("tools", new ToolNode(executableTools), { retryPolicy })
    .addNode("compose_email", runComposeEmail)

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

  // Postgres checkpointer, and the pgvector KB seeded before first search.
  const [checkpointer] = await Promise.all([getCheckpointer(), ensureIndexed()]);

  return workflow.compile({ checkpointer });
}

export const graph = await buildGraph();
