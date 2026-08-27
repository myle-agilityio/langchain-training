import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { copilotkitCustomizeConfig } from "@copilotkit/sdk-js/langgraph";

import { AppError, ERROR_CODE } from "@/errors";
import {
  CHAT_MODEL_HEADER,
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL_ID,
  OPENAI_API_KEY_HEADER,
} from "@/constants";

export const EMBEDDING_MODEL = "text-embedding-3-small";

const CHAT_MODEL_IDS = new Set<string>(CHAT_MODEL_OPTIONS.map((o) => o.id));

// Reads a forwarded header, case-insensitively, off copilotkit_forwarded_headers.
const getForwardedHeader = (
  config: LangGraphRunnableConfig,
  name: string,
): string | undefined => {
  const headers = config.configurable?.copilotkit_forwarded_headers as
    Record<string, string> | undefined;

  return headers
    ? Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1]
    : undefined;
};

// BYOK: CopilotKit forwards the visitor's key via config.configurable.copilotkit_forwarded_headers.
// Falls back to process.env.OPENAI_API_KEY when unset (e.g. running from LangSmith Studio).
export const getApiKeyFromConfig = (
  config: LangGraphRunnableConfig,
): string => {
  const key = getForwardedHeader(config, OPENAI_API_KEY_HEADER);
  const resolved = key ?? process.env.OPENAI_API_KEY;

  if (!resolved) {
    throw new AppError(ERROR_CODE.API_KEY_MISSING);
  }

  return resolved;
};

// The teacher's model pick from the chat header, same forwarding path as the API key. Falls
// back to the default when absent or not one of the offered options.
const getChatModelIdFromConfig = (config: LangGraphRunnableConfig): string => {
  const requested = getForwardedHeader(config, CHAT_MODEL_HEADER);

  return requested && CHAT_MODEL_IDS.has(requested)
    ? requested
    : DEFAULT_CHAT_MODEL_ID;
};

// One tool call per turn, which the router relies on. Honors the teacher's picked model.
export const getModelWithConfig = (
  config: LangGraphRunnableConfig,
): ChatOpenAI => {
  return new ChatOpenAI({
    model: getChatModelIdFromConfig(config),
    apiKey: getApiKeyFromConfig(config),
    modelKwargs: { parallel_tool_calls: false },
  });
};

// The A2UI tool's model — same BYOK key, same teacher-picked model as the chat turn.
export const getA2uiModelWithConfig = (
  config: LangGraphRunnableConfig,
): ChatOpenAI => {
  return new ChatOpenAI({
    model: getChatModelIdFromConfig(config),
    apiKey: getApiKeyFromConfig(config),
  });
};

// No tool kwargs — withStructuredOutput 400s if parallel_tool_calls rides along. Same
// teacher-picked model as the chat turn — these are internal steps within the same reply.
export const getPlainModelWithConfig = (
  config: LangGraphRunnableConfig,
): ChatOpenAI => {
  return new ChatOpenAI({
    model: getChatModelIdFromConfig(config),
    apiKey: getApiKeyFromConfig(config),
  });
};

// Embeddings for RAG queries against the shared pgvector knowledge base.
export const getEmbeddingsWithConfig = (
  config: LangGraphRunnableConfig,
): OpenAIEmbeddings => getEmbeddingsWithApiKey(getApiKeyFromConfig(config));

// Same, for the HTTP routes — they read the visitor's key off a header, not a runnable config.
export const getEmbeddingsWithApiKey = (
  apiKey: string | undefined,
): OpenAIEmbeddings => {
  if (!apiKey) {
    throw new AppError(ERROR_CODE.API_KEY_MISSING);
  }

  return new OpenAIEmbeddings({ model: EMBEDDING_MODEL, apiKey });
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
