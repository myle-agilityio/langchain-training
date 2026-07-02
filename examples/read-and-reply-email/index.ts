import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { Command, END, INTERRUPT, isInterrupted, MemorySaver, START, StateGraph } from "@langchain/langgraph";
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

// Shape of the payload passed to interrupt() in humanReview (nodes.ts)
type ReviewRequest = {
  emailId: string;
  originalEmail: string;
  draftResponse: string | undefined;
  urgency: string;
  intent: string;
  action: string;
};

// Create the graph
const workflow = new StateGraph(EmailAgentState)
  // Add nodes with appropriate error handling
  .addNode("readEmail", readEmail)
  .addNode("classifyIntent", classifyIntent, {
    ends: ["searchDocumentation", "draftResponse", "bugTracking"],
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
let result = await app.invoke(initialState, config);

// The graph pauses at humanReview via interrupt() -- resume it once a human responds
while (isInterrupted<ReviewRequest>(result)) {
  const reviewRequest = result[INTERRUPT][0].value!;
  console.log("\n--- Human review requested ---");
  console.log(`Original email: ${reviewRequest.originalEmail}`);
  console.log(`Draft response: ${reviewRequest.draftResponse}`);
  console.log(`Urgency: ${reviewRequest.urgency} | Intent: ${reviewRequest.intent}`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Approve this response? (y/n): ");
  const editedResponse = answer.trim().toLowerCase() === "y"
    ? await rl.question("Edit the response, or press enter to keep as-is: ")
    : "";
  rl.close();

  result = await app.invoke(
    new Command({
      resume: {
        approved: answer.trim().toLowerCase() === "y",
        editedResponse: editedResponse || undefined,
      },
    }),
    config,
  );
}

