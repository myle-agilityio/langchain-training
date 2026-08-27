import { Hono } from "hono";

import { getEmbeddingsForApiKey } from "@/config";
import { searchKnowledge } from "@/rag";
import { validate } from "./middleware";
import {
  SearchKnowledgeQuerySchema,
  type SearchKnowledgeQuery,
} from "./schemas";
import type { AppEnv } from "./types";

export const knowledgeApp = new Hono<AppEnv>();

// The same pgvector search the search_knowledge_base tool runs, without spending an LLM turn.
knowledgeApp.get(
  "/",
  validate("query", SearchKnowledgeQuerySchema),
  async (c) => {
    const { q, k } = c.get("valid") as SearchKnowledgeQuery;
    // Visitor's own key (BYOK) first, same as threads.ts — process.env is the leftover fallback.
    const apiKey =
      c.req.header("x-openai-api-key") ?? process.env.OPENAI_API_KEY;

    return c.json({
      articles: await searchKnowledge(q, getEmbeddingsForApiKey(apiKey), k),
    });
  },
);
