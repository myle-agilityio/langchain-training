import { OPENAI_API_KEY_HEADER } from "@repo/constants";
import { apiClient } from "./client";

const KNOWLEDGE_PATH = "/api/knowledge";

export interface KnowledgeArticle {
  title: string;
  content: string;
}

// The same pgvector search the agent's search_knowledge_base tool runs, without an LLM turn.
export const searchKnowledgeBase = async (
  query: string,
  apiKey?: string | null,
): Promise<KnowledgeArticle[]> =>
  (
    await apiClient.get<{ articles: KnowledgeArticle[] }>(KNOWLEDGE_PATH, {
      params: { query },
      headers: apiKey ? { [OPENAI_API_KEY_HEADER]: apiKey } : undefined,
    })
  ).data.articles;
