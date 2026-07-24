import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Document } from "@langchain/core/documents";

import { embeddings } from "../config/model.js";
import { KB_TABLE } from "../constants/index.js";
import { getPool } from "../db/index.js";
import { knowledgeBase } from "./knowledge-base.js";

let vectorStore: PGVectorStore | undefined;

// initialize() creates the vector extension + table on first use.
export async function getVectorStore(): Promise<PGVectorStore> {
  vectorStore ??= await PGVectorStore.initialize(embeddings, {
    pool: getPool(),
    tableName: KB_TABLE,
  });
  return vectorStore;
}

// Embed the seed articles once; a non-empty table means someone already seeded.
export async function ensureIndexed(): Promise<void> {
  const store = await getVectorStore();
  const { rows } = await getPool().query<{ n: number }>(
    `SELECT count(*)::int AS n FROM ${KB_TABLE}`,
  );
  if (rows[0].n > 0) return;
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

// Semantic search over the embedded KB — replaces the old keyword matcher.
export async function searchKnowledge(
  query: string,
  k = 3,
): Promise<{ title: string; content: string }[]> {
  const store = await getVectorStore();
  const docs = await store.similaritySearch(query, k);
  return docs.map((d) => ({
    title: String(d.metadata.title ?? ""),
    content: d.pageContent,
  }));
}
