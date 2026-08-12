import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { OpenAIEmbeddings } from "@langchain/openai";

import { getEmbeddingsForConfig, getServerEmbeddings } from "@/config/model.js";
import { KB_TABLE } from "@/constants/index.js";
import { getPool } from "@/db/index.js";
import { knowledgeBase } from "./knowledge-base.js";

// initialize() creates the vector extension + table on first use (idempotent — IF NOT EXISTS —
// so calling this per request, with whichever embeddings client the caller needs, is fine).
function getVectorStore(embeddings: OpenAIEmbeddings): Promise<PGVectorStore> {
  return PGVectorStore.initialize(embeddings, { pool: getPool(), tableName: KB_TABLE });
}

// Embed the seed articles once; a non-empty table means someone already seeded. Runs at agent
// startup, before any visitor request/config exists, so it uses the server-side key
// (config/model.ts's getServerEmbeddings) rather than a visitor's BYOK key.
export async function ensureIndexed(): Promise<void> {
  const { rows } = await getPool().query<{ n: number }>(
    `SELECT count(*)::int AS n FROM ${KB_TABLE}`,
  );
  if (rows[0].n > 0) return;

  const embeddings = getServerEmbeddings();
  if (!embeddings) {
    console.warn("[rag] OPENAI_API_KEY not set on the server — skipping knowledge base seeding.");
    return;
  }
  const store = await getVectorStore(embeddings);
  await store.addDocuments(
    knowledgeBase.map(
      (a) =>
        new Document({
          pageContent: `${a.title}\n\n${a.content}`,
          metadata: { id: a.id, title: a.title, tags: a.tags },
        }),
    ),
  );
}

// Semantic search over the embedded KB — replaces the old keyword matcher. Embeds the query
// with the visitor's own key (BYOK, via getEmbeddingsForConfig), not the seed-time server key.
export async function searchKnowledge(
  query: string,
  config: LangGraphRunnableConfig,
  k = 3,
): Promise<{ title: string; content: string }[]> {
  const store = await getVectorStore(getEmbeddingsForConfig(config));
  const docs = await store.similaritySearch(query, k);
  return docs.map((d) => ({
    title: String(d.metadata.title ?? ""),
    content: d.pageContent,
  }));
}
