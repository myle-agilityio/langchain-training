import "dotenv/config";
import { END, MemorySaver, START, StateGraph } from "@langchain/langgraph";
import { EmailAgentState } from "./state.ts";
import {
  classifyIntent,
  readEmail,
  searchDocumentation,
  bugTracking,
  draftResponse,
  humanReview,
  sendReply
} from "./nodes.ts";
import { EmailAgentStateType } from "./types.ts";

// Create the graph
const workflow = new StateGraph(EmailAgentState)
  // Add nodes with appropriate error handling
  .addNode("readEmail", readEmail)
  .addNode("classifyIntent", classifyIntent, {
    ends: ["searchDocumentation", "humanReview", "draftResponse", "bugTracking"],
  })
  // Add retry policy for nodes that might have transient failures
  .addNode(
    "searchDocumentation",
    searchDocumentation,
    { retryPolicy: { maxAttempts: 3 }, ends: ["draftResponse"] },
  )
  .addNode("bugTracking", bugTracking, { ends: ["draftResponse"] })
  .addNode("draftResponse", draftResponse, { ends: ["humanReview", "sendReply"] })
  .addNode("humanReview", humanReview, { ends: ["sendReply", END] })
  .addNode("sendReply", sendReply)
  // Add only the essential edges
  .addEdge(START, "readEmail")
  .addEdge("readEmail", "classifyIntent")
  .addEdge("sendReply", END);

// Compile with checkpointer for persistence
const memory = new MemorySaver();
const app = workflow.compile({ checkpointer: memory });

// Test with an urgent billing issue
const initialState: EmailAgentStateType = {
  emailContent: "I was charged twice for my subscription! This is urgent!",
  senderEmail: "customer@example.com",
  emailId: "email_123"
};

// Run with a thread_id for persistence
const config = { configurable: { thread_id: "customer_123" } };
const result = await app.invoke(initialState, config);
// The graph will pause at human_review
console.log(`Draft ready for review: ${result.responseText?.substring(0, 100)}...`);
