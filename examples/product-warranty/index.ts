import "dotenv/config";
import * as readline from "readline";

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

let prevMessageCount = 0;

function logNewMessages(result: { messages: { content: unknown; _getType: () => string }[] }) {
  const newMessages = result.messages.slice(prevMessageCount);
  for (const msg of newMessages) {
    if (msg._getType() !== "human" && msg.content) {
      console.log(`\nAgent: ${msg.content}\n`);
    }
  }
  prevMessageCount = result.messages.length;
}

console.log("Customer Support Agent (type 'exit' to quit)\n");

let turn = 1;
while (true) {
  const userInput = await prompt("You: ");
  if (userInput.toLowerCase() === "exit") break;

  const result = await agent.invoke(
    { messages: [new HumanMessage(userInput)] },
    config
  );
  logNewMessages(result);
  turn++;
}

rl.close();
