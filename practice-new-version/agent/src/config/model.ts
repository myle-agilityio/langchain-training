import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

export const MODEL = "gpt-4o-mini";

// One tool call per turn, which the router relies on.
export const model = new ChatOpenAI({
  model: MODEL,
  modelKwargs: { parallel_tool_calls: false },
});

// No tool kwargs — withStructuredOutput 400s if parallel_tool_calls rides along.
export const plainModel = new ChatOpenAI({ model: MODEL });

// Embeddings for the pgvector knowledge base.
export const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
