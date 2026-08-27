import { apiClient } from "./client";

const KNOWLEDGE_PATH = "/api/knowledge";

export interface KnowledgeArticle {
  title: string;
  content: string;
}

// The same pgvector search the agent's search_knowledge_base tool runs, without an LLM turn.
export const searchKnowledgeBase = async (
  q: string,
  apiKey?: string | null,
): Promise<KnowledgeArticle[]> =>
  (
    await apiClient.get<{ articles: KnowledgeArticle[] }>(KNOWLEDGE_PATH, {
      params: { q },
      headers: apiKey ? { "x-openai-api-key": apiKey } : undefined,
    })
  ).data.articles;
