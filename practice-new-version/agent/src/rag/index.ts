import { join } from "node:path";

import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { OpenAIEmbeddings } from "@langchain/openai";

import { getRagScoreThreshold } from "../config/env";
import { getEmbeddingsForConfig, getServerEmbeddings } from "@/config/model";
import { KB_TABLE } from "@/constants/index";
import { getPool } from "@/db/index";
import { knowledgeBase } from "./knowledge-base";
import { loadDirectoryAsChunks } from "./loaders";

const SAMPLE_DOCS_DIR = join(import.meta.dirname, "sample-docs");

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
  const seedDocs = knowledgeBase.map(
    (a) =>
      new Document({
        pageContent: `${a.title}\n\n${a.content}`,
        metadata: { id: a.id, title: a.title, tags: a.tags },
      }),
  );
  const fileDocs = await loadDirectoryAsChunks(SAMPLE_DOCS_DIR);
  await store.addDocuments([...seedDocs, ...fileDocs]);
}

// PGVectorStore's default scoreNormalization returns raw cosine distance (0=identical, 2=opposite);
// convert to similarity (0-1, higher=better) so the threshold reads the way a relevance score should.
function distanceToSimilarity(distance: number): number {
  return 1 - distance / 2;
}

// Semantic search over the embedded KB — replaces the old keyword matcher. Embeds the query
// with the visitor's own key (BYOK, via getEmbeddingsForConfig), not the seed-time server key.
export async function searchKnowledge(
  query: string,
  config: LangGraphRunnableConfig,
  k = 3,
): Promise<{ title: string; content: string }[]> {
  const store = await getVectorStore(getEmbeddingsForConfig(config));
  const results = await store.similaritySearchWithScore(query, k);
  const threshold = getRagScoreThreshold();
  return results
    .filter(([, distance]) => distanceToSimilarity(distance) >= threshold)
    .map(([d]) => ({
      title: String(d.metadata.title ?? ""),
      content: d.pageContent,
    }));
}
