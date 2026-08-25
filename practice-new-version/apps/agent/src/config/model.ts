import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { copilotkitCustomizeConfig } from "@copilotkit/sdk-js/langgraph";

import { AppError, ERROR_CODE } from "@/errors/index";

export const MODEL = "gpt-4o-mini";
export const A2UI_MODEL = "gpt-4.1";
export const EMBEDDING_MODEL = "text-embedding-3-small";

// BYOK: CopilotKit forwards the visitor's key via config.configurable.copilotkit_forwarded_headers.
// Falls back to process.env.OPENAI_API_KEY when unset (e.g. running from LangSmith Studio).
export const getApiKeyFromConfig = (
  config: LangGraphRunnableConfig,
): string => {
  const headers = config.configurable?.copilotkit_forwarded_headers as
    Record<string, string> | undefined;
  const key = headers
    ? Object.entries(headers).find(
        ([name]) => name.toLowerCase() === "x-openai-api-key",
      )?.[1]
    : undefined;
  const resolved = key ?? process.env.OPENAI_API_KEY;
  if (!resolved) throw new AppError(ERROR_CODE.API_KEY_MISSING);
  return resolved;
};

// One tool call per turn, which the router relies on.
export const getModelForConfig = (
  config: LangGraphRunnableConfig,
): ChatOpenAI => {
  return new ChatOpenAI({
    model: MODEL,
    apiKey: getApiKeyFromConfig(config),
    modelKwargs: { parallel_tool_calls: false },
  });
};

// The A2UI tool's secondary model — same BYOK key, its own model id.
export const getA2uiModelForConfig = (
  config: LangGraphRunnableConfig,
): ChatOpenAI => {
  return new ChatOpenAI({
    model: A2UI_MODEL,
    apiKey: getApiKeyFromConfig(config),
  });
};

// No tool kwargs — withStructuredOutput 400s if parallel_tool_calls rides along.
export const getPlainModelForConfig = (
  config: LangGraphRunnableConfig,
): ChatOpenAI => {
  return new ChatOpenAI({ model: MODEL, apiKey: getApiKeyFromConfig(config) });
};

// Embeddings for RAG queries against the shared pgvector knowledge base.
export const getEmbeddingsForConfig = (
  config: LangGraphRunnableConfig,
): OpenAIEmbeddings => {
  return new OpenAIEmbeddings({
    model: EMBEDDING_MODEL,
    apiKey: getApiKeyFromConfig(config),
  });
};

// These internal structured-output calls are classifier/drafting steps, not chat replies — hide
// their forced tool calls from the chat UI.
export const hidden = (config: LangGraphRunnableConfig) =>
  copilotkitCustomizeConfig(config, {
    emitMessages: false,
    emitToolCalls: false,
  });

// Server-side key used ONLY to seed the shared KB at startup (rag/index.ts's ensureIndexed),
// before any visitor request exists to pull a key from. May be unset once already seeded.
export const getServerEmbeddings = (): OpenAIEmbeddings | undefined => {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey
    ? new OpenAIEmbeddings({ model: EMBEDDING_MODEL, apiKey })
    : undefined;
};
