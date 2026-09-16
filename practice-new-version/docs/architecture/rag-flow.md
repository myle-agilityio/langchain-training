# RAG flow (`apps/agent/src/rag/`)

Two separate flows over the same `kb_documents` pgvector table: seeding it once at startup, and
querying it per request from the `search_knowledge_base` tool (see [Tools](./tools.md)).

```mermaid
graph TD
    subgraph Seed["Seeding — ensureIndexed(), runs once at agent boot"]
        SeedArticles["knowledgeBase.ts\n(hardcoded articles)"]
        SampleDocs["rag/sample-docs/*\n(PDF/DOCX)"]
        Loader["loaders.ts\nloadDirectoryAsChunks"]
        Embed["OpenAIEmbeddings\n(server-side key)"]

        SeedArticles --> Embed
        SampleDocs --> Loader --> Embed
        Embed -- "store.addDocuments\n(only if table is empty)" --> KB
    end

    subgraph Query["Query — searchKnowledge()"]
        Tool["search_knowledge_base tool\n(graph, BYOK via config)"]
        QEmbed["caller's OpenAIEmbeddings"]
        Similarity["similaritySearchWithScore\n+ distanceToSimilarity\n+ score threshold filter"]

        Tool --> QEmbed
        QEmbed --> Similarity
        Similarity --> KB
        Similarity --> Results["{ title, content }[]"]
    end

    KB[("kb_documents (pgvector)")]
```
