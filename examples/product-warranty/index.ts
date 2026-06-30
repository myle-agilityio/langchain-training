import "dotenv/config";

import { createAgent } from "langchain";
import { HumanMessage } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { recordWarrantyStatus, recordIssueType, provideSolution, escalateToHuman } from "./tools.js";
import { applyStepMiddleware } from "./middleware.js";

// Collect all tools from all step configurations
const allTools = [
  recordWarrantyStatus,
  recordIssueType,
  provideSolution,
  escalateToHuman,
];

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
});

// Create the agent with step-based configuration
const agent = createAgent({
  model,
  tools: allTools,
  middleware: [applyStepMiddleware],
  checkpointer: new MemorySaver(),
});

// Configuration for this conversation thread
const threadId = crypto.randomUUID();
const config = { configurable: { thread_id: threadId } };

let prevMessageCount = 0;

function logNewMessages(result: { messages: { content: unknown }[]; currentStep?: string }) {
  const newMessages = result.messages.slice(prevMessageCount);
  for (const msg of newMessages) {
    console.log(msg.content);
  }
  prevMessageCount = result.messages.length;
}

// Turn 1: Initial message - starts with warranty_collector step
console.log("=== Turn 1: Warranty Collection ===");
let result = await agent.invoke(
  { messages: [new HumanMessage("Hi, my phone screen is cracked")] },
  config
);
logNewMessages(result);

// Turn 2: User responds about warranty
console.log("\n=== Turn 2: Warranty Response ===");
result = await agent.invoke(
  { messages: [new HumanMessage("Yes, it's still under warranty")] },
  config
);
logNewMessages(result);
console.log(`Current step: ${result.currentStep}`);

// Turn 3: User describes the issue
console.log("\n=== Turn 3: Issue Description ===");
result = await agent.invoke(
  {
    messages: [
      new HumanMessage("The screen is physically cracked from dropping it"),
    ],
  },
  config
);
logNewMessages(result);
console.log(`Current step: ${result.currentStep}`);

// Turn 4: Resolution
console.log("\n=== Turn 4: Resolution ===");
result = await agent.invoke(
  { messages: [new HumanMessage("What should I do?")] },
  config
);
logNewMessages(result);
