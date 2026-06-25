import "dotenv/config";
import { MemorySaver } from "@langchain/langgraph";
import { createDeepAgent } from "deepagents";
import { tool } from "@langchain/core/tools";
import { createAgent, initChatModel } from "langchain";
import { z } from "zod";

// Step 1: Define the system prompt
const SYSTEM_PROMPT = `You are a literary data assistant.

## Capabilities

- \`fetch_text_from_url\`: loads document text from a URL into the conversation.
Do not guess line counts or positions—ground them in tool results from the saved file.`;

// Step 2: Create tools
const fetchTextFromUrl = tool(
  async ({ url }: { url: string }): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; quickstart-research/1.0)",
        },
        signal: controller.signal,
      });
      if (!resp.ok) {
        return `Fetch failed: HTTP ${resp.status} ${resp.statusText}`;
      }

      return await resp.text();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return `Fetch failed: ${msg}`;
    } finally {
      clearTimeout(timeoutId);
    }
  },
  {
    name: "fetch_text_from_url",
    description: "Fetch the document from a URL.",
    schema: z.object({ url: z.string().url() }),
  },
);

// Step 3: Configure your model
const model = await initChatModel("gpt-4o-mini", {
  temperature: 0.5,
});

// Step 4: Add memory
const checkpointer = new MemorySaver();

async function main() {
  const agent = createAgent({
    model,
    tools: [fetchTextFromUrl],
    systemPrompt: SYSTEM_PROMPT,
    checkpointer,
  });

  const deepAgent = createDeepAgent({
    model,
    tools: [fetchTextFromUrl],
    systemPrompt: SYSTEM_PROMPT,
    checkpointer,
  });

  const content = `Project Gutenberg hosts a full plain-text copy of F. Scott Fitzgerald's The Great Gatsby.
  URL: https://www.gutenberg.org/files/64317/64317-0.txt

  Please help summary it.`;

  const agentResult = await agent.invoke(
    { messages: [{ role: "user", content }] },
    { configurable: { thread_id: "great-gatsby-lc" } },
  );
  const deepAgentResult = await deepAgent.invoke(
    { messages: [{ role: "user", content }] },
    { configurable: { thread_id: "great-gatsby-da" } },
  );

  const agentMessages = agentResult.messages;
  const deepMessages = deepAgentResult.messages;
  console.log("=== LangChain Agent ===");
  console.log(agentMessages[agentMessages.length - 1].content);
  console.log("\n");
  console.log("=== Deep Agent ===");
  console.log(deepMessages[deepMessages.length - 1].content);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
