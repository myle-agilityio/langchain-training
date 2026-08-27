import { join } from "node:path";

import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";
import type { OpenAIEmbeddings } from "@langchain/openai";

import { getRagScoreThreshold } from "../config";
import { logWarn } from "@/logging";
import { getServerEmbeddings } from "@/config";
import { KB_TABLE } from "@/constants";
import { getPool } from "@/db";
import { knowledgeBase } from "./knowledgeBase";
import { loadDirectoryAsChunks } from "./loaders";

const SAMPLE_DOCS_DIR = join(import.meta.dirname, "sample-docs");

// initialize() creates the vector extension + table on first use (idempotent — IF NOT EXISTS —
// so calling this per request, with whichever embeddings client the caller needs, is fine).
const getVectorStore = (
  embeddings: OpenAIEmbeddings,
): Promise<PGVectorStore> => {
  return PGVectorStore.initialize(embeddings, {
    pool: getPool(),
    tableName: KB_TABLE,
  });
};

// Embeds the seed articles once (a non-empty table means already seeded). Runs at agent
// startup, before any request exists, so it uses the server-side key, not a visitor's BYOK key.
export const ensureIndexed = async (): Promise<void> => {
  const embeddings = getServerEmbeddings();

  if (!embeddings) {
    logWarn("rag.seed_skipped", {
      detail: "OPENAI_API_KEY not set on the server",
    });

    return;
  }

  // initialize() first — the count below reads a table this call is what creates.
  const store = await getVectorStore(embeddings);
  const { rows } = await getPool().query<{ n: number }>(
    `SELECT count(*)::int AS n FROM ${KB_TABLE}`,
  );

  if (rows[0].n > 0) {
    return;
  }

  const seedDocs = knowledgeBase.map(
    (a) =>
      new Document({
        pageContent: a.content,
        metadata: { id: a.id, title: a.title, tags: a.tags },
      }),
  );
  const fileDocs = await loadDirectoryAsChunks(SAMPLE_DOCS_DIR);

  await store.addDocuments([...seedDocs, ...fileDocs]);
};

// PGVectorStore's default scoreNormalization returns raw cosine distance (0=identical, 2=opposite);
// convert to similarity (0-1, higher=better) so the threshold reads the way a relevance score should.
const distanceToSimilarity = (distance: number): number => 1 - distance / 2;

// Semantic search over the embedded KB. Takes the caller's own embeddings client so graph nodes
// (BYOK via config) and HTTP routes (BYOK via header) run the same search, never the seed key.
export const searchKnowledge = async (
  query: string,
  embeddings: OpenAIEmbeddings,
  k = 3,
): Promise<{ title: string; content: string }[]> => {
  const store = await getVectorStore(embeddings);
  const results = await store.similaritySearchWithScore(query, k);
  const threshold = getRagScoreThreshold();

  return results
    .filter(([, distance]) => distanceToSimilarity(distance) >= threshold)
    .map(([d]) => ({
      title: String(d.metadata.title ?? ""),
      content: d.pageContent,
    }));
};
