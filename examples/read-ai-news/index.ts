import "dotenv/config";

import { createAgent, initChatModel } from "langchain";
import { fetchArticleContent, searchAINews } from "./tools.js";
import { SYSTEM_PROMPT } from "./constants.js";
import { AgentOutput } from "./schema.js";

const model = await initChatModel("gpt-4o-mini", { temperature: 0.3 });

async function main() {
  const agent = createAgent({
    model,
    tools: [searchAINews, fetchArticleContent],
    systemPrompt: SYSTEM_PROMPT,
    responseFormat: AgentOutput,
  });

  const stream = await agent.stream(
    {
      messages: [
        {
          role: "user",
          content: "What are the top AI news stories this week? Give me a summary of the 5 most important ones.",
        },
      ],
    },
    { streamMode: ["messages", "custom", "updates"] },
  );

  for await (const [mode, chunk] of stream) {
    if (mode === "custom") {
      console.log(`\n[Tool] ${chunk}`);
    } else if (mode === "updates") {
      // structuredResponse is nested under the node name, e.g. { generate_structured_response: { structuredResponse: ... } }
      const update = chunk as Record<string, Record<string, unknown>>;
      for (const nodeUpdate of Object.values(update)) {
        if (nodeUpdate && "structuredResponse" in nodeUpdate) {
          console.log("\n\n=== Structured Output ===\n");
          console.log(JSON.stringify(nodeUpdate.structuredResponse, null, 2));
        }
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
