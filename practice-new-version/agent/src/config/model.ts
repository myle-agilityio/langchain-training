import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { copilotkitCustomizeConfig } from "@copilotkit/sdk-js/langgraph";

export const MODEL = "gpt-4o-mini";
export const EMBEDDING_MODEL = "text-embedding-3-small";

export class MissingApiKeyError extends Error {
  constructor() {
    super("Missing OpenAI API key");
    this.name = "MissingApiKeyError";
  }
}

// BYOK: the browser sends the visitor's own key per request (layout.tsx's <CopilotKit
// headers={...}>); CopilotKit forwards arbitrary client headers into
// config.configurable.copilotkit_forwarded_headers automatically, no runtime-side wiring
// needed. Every model call below pulls the key from here instead of process.env.
// Falls back to process.env.OPENAI_API_KEY when no header is present (e.g. running the graph
// directly from LangSmith Studio, which bypasses CopilotKit and never sets the header).
export function getApiKeyFromConfig(config: LangGraphRunnableConfig): string {
  const headers = config.configurable?.copilotkit_forwarded_headers as
    | Record<string, string>
    | undefined;
  const key = headers
    ? Object.entries(headers).find(([name]) => name.toLowerCase() === "x-openai-api-key")?.[1]
    : undefined;
  const resolved = key ?? process.env.OPENAI_API_KEY;
  if (!resolved) throw new MissingApiKeyError();
  return resolved;
}

// One tool call per turn, which the router relies on.
export function getModelForConfig(config: LangGraphRunnableConfig): ChatOpenAI {
  return new ChatOpenAI({
    model: MODEL,
    apiKey: getApiKeyFromConfig(config),
    modelKwargs: { parallel_tool_calls: false },
  });
}

// No tool kwargs — withStructuredOutput 400s if parallel_tool_calls rides along.
export function getPlainModelForConfig(config: LangGraphRunnableConfig): ChatOpenAI {
  return new ChatOpenAI({ model: MODEL, apiKey: getApiKeyFromConfig(config) });
}

// Embeddings for RAG queries against the shared pgvector knowledge base.
export function getEmbeddingsForConfig(config: LangGraphRunnableConfig): OpenAIEmbeddings {
  return new OpenAIEmbeddings({ model: EMBEDDING_MODEL, apiKey: getApiKeyFromConfig(config) });
}

// These internal structured-output calls are classifier/drafting steps, not chat replies — hide
// their forced tool calls from the chat UI.
export const hidden = (config: LangGraphRunnableConfig) =>
  copilotkitCustomizeConfig(config, {
    emitMessages: false,
    emitToolCalls: false,
  });

// Server-side key used ONLY to seed the shared knowledge base once at agent startup
// (rag/index.ts's ensureIndexed) — that runs before any visitor request exists, so there's no
// config to pull a key from. Every per-request call above uses the visitor's own key instead;
// this one may be left unset once the KB is already seeded (ensureIndexed no-ops if so).
export function getServerEmbeddings(): OpenAIEmbeddings | undefined {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey ? new OpenAIEmbeddings({ model: EMBEDDING_MODEL, apiKey }) : undefined;
}
