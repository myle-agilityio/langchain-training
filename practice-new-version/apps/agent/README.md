# `agent` — LangGraph.js inbox assistant

The backend half of the AI Email Assistant: a LangGraph.js agent plus a custom Hono HTTP app,
both served by `langgraphjs dev` on port `8123`. It classifies email, searches a pgvector
knowledge base, drafts replies behind a human approval interrupt, and owns every Postgres table
the app uses.

For the graph and subgraph diagrams see [ARCHITECTURE.md](../../docs/ARCHITECTURE.md); for the
UI that talks to it see [`apps/web`](../web/README.md).

## Running it

```bash
pnpm dev:agent          # from the repo root — langgraphjs dev on :8123
pnpm --filter agent typecheck
```

Env comes from the **root** `.env` (wired up by `langgraph.json`'s `"env": "../../.env"`), not
from a file in this package. `DATABASE_URL` is required; `OPENAI_API_KEY` is only a bootstrap
fallback — chat, classification, drafting, and RAG all run on the key the browser forwards
per-request as `x-openai-api-key`.

`langgraph.json` registers three things:

| Key        | Value                                                       | What it is                                   |
| ---------- | ----------------------------------------------------------- | -------------------------------------------- |
| `graphs`   | `./src/index.ts:graph`                                      | `inbox_assistant` — the main graph           |
| `graphs`   | `./src/graphs/composeEmailSubgraph.ts:composeEmailSubgraph` | `compose_email_debug` — subgraph, for Studio |
| `http.app` | `./src/http/index.ts:app`                                   | Hono app merged into the dev server's routes |

## Structure

```
src/
├── index.ts              # Entry registered in langgraph.json — re-exports `graph`
├── agent.ts              # Loads config/env, awaits buildGraph()
├── graphs/
│   ├── index.ts          # buildGraph(): ReAct loop, moderator gate, compose_email node
│   └── composeEmailSubgraph.ts   # triage → research → draft → compliance → approval
├── nodes/
│   ├── callModel.ts      # Model call + routeAfterModel (tools / compose_email / END)
│   ├── moderator.ts      # Hard block on unsafe input + afterModeration router
│   └── composeEmail/     # triage, research, writeDraft, checkCompliance,
│                         #   requestApproval (interrupt()), errorHandler
├── tools/                # One file per tool; index.ts splits modelTools vs executableTools
│                         #   (reply_to_email is routing-only — the ToolNode never runs it)
├── prompts/              # Every prompt string: systemPrompt, classify, composeEmail, moderation
├── state/index.ts        # AgentState — CopilotKitStateSchema fields + draft/compliance/flags
├── types/                # Zod schemas + interfaces (email, compose, contactProfile, …)
├── db/
│   ├── index.ts          # pg.Pool (cached on globalThis) + the graph-tool queries
│   ├── inbox.ts          # Queries for the HTTP inbox routes (seed, bulk status, reply patch)
│   ├── threads.ts        # chat_threads table for the self-managed thread list
│   ├── checkpointer.ts   # PostgresSaver — restart-safe threads
│   └── memoryStore.ts    # PostgresStore — cross-thread memory (BaseStore)
├── rag/
│   ├── index.ts          # ensureIndexed() seeds kb_documents; searchKnowledge() semantic search
│   ├── knowledgeBase.ts  # Curriculum seed articles
│   ├── loaders.ts        # PDF/DOCX → chunks; titles derived from the filename
│   └── sample-docs/      # Policy source documents (kebab-case, by rule)
├── http/
│   ├── index.ts          # Hono app: mounts the three routers below
│   ├── copilotkit.ts     # CopilotKit runtime endpoint (/api/copilotkit)
│   ├── emails.ts         # GET/PATCH /api/emails
│   └── threads.ts        # GET/POST/PATCH/DELETE /api/threads + LLM title generation
├── config/
│   ├── env.ts            # DATABASE_URL / RAG_SCORE_THRESHOLD / pg TLS options, read at call time
│   └── model.ts          # MODEL, EMBEDDING_MODEL, per-request key resolution
├── constants/            # Tool names, table names, A2UI and compose constants
├── data/seedEmails.ts    # Inbox seed, inserted on first boot against an empty `emails` table
└── utils/                # a2ui, email, messages, redaction (PII), apiKeyNotice
```

## The graph at a glance

- `START → moderator` — hard-blocks unsafe input and routes straight to `END`; anything else
  falls through to the ReAct loop.
- `call_model` — the loop itself, routing on what the model asked for:
  - a `reply_to_email` call → the `compose_email` subgraph
  - any other tool call → a `ToolNode`
  - a plain answer → `END`
- **Node defaults** — 3 retries, 60s run timeout (90s for tools).
- **Compiled with** the Postgres checkpointer and store; `ensureIndexed()` runs before the
  first search.

## Stack

| Package                                              | Version        | Role                                        |
| ---------------------------------------------------- | -------------- | ------------------------------------------- |
| `@langchain/langgraph`                               | 1.4.8          | StateGraph, subgraphs, `interrupt()`        |
| `@langchain/langgraph-cli`                           | 1.4.3          | `langgraphjs dev` — server + Studio         |
| `langchain` / `@langchain/core`                      | 1.3.4 / 1.1.49 | Messages, tools, structured output          |
| `@langchain/openai`                                  | 1.4.4          | `gpt-4o-mini`, `text-embedding-3-small`     |
| `@langchain/community`                               | ^1.1.29        | `PGVectorStore`                             |
| `@langchain/langgraph-checkpoint-postgres`           | ^1.0.4         | `PostgresSaver`, `PostgresStore`            |
| `@copilotkit/runtime` / `@copilotkit/sdk-js`         | 1.62.3         | CopilotKit endpoint + state schema          |
| `hono`                                               | ^4.12.10       | The custom HTTP app                         |
| `pg`                                                 | ^8.22.0        | Postgres driver (one shared pool)           |
| `zod`                                                | ^3.23.8        | Tool args, structured output, state schemas |
| `pdf-parse` / `mammoth` / `@langchain/textsplitters` | —              | KB document loading and chunking            |
| TypeScript                                           | ^5.6.3         | `tsc --noEmit` via `pnpm typecheck`         |

## Tables it owns

All in the one Postgres behind `DATABASE_URL`, created on first connect:

- `emails`, `contact_profiles` — the inbox
- `kb_documents` — the embedded knowledge base (pgvector)
- `checkpoints*` — graph checkpoints (`PostgresSaver`)
- `store*` — cross-thread memory (`PostgresStore`)
- `chat_threads` — the self-managed thread list, used when Threads is off

## Deploying

`Dockerfile` builds from the **repo root** as context so it can see the workspace lockfile, then
`pnpm deploy --filter=agent --prod` into a slim runtime image. `pnpm start` runs
`langgraphjs dev --host 0.0.0.0 --port $PORT`.
