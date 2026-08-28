# `agent` — LangGraph.js inbox assistant

The backend half of the AI Email Assistant: a LangGraph.js agent plus a custom Hono HTTP app,
both served by `langgraphjs dev` on port `8123`. It classifies email, searches a pgvector
knowledge base, drafts replies behind a human approval interrupt, and owns every Postgres table
the app uses.

## Running it

```bash
pnpm dev:agent          # from the repo root — langgraphjs dev on :8123
pnpm --filter agent typecheck
```

## Environment

| Variable              | Required            | Read by                                 | Purpose                                                                                     |
| --------------------- | ------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | **Yes**             | `config/env.ts`                         | The one Postgres holding inbox, KB, checkpoints, and store. Throws on startup if unset.     |
| `OPENAI_API_KEY`      | No                  | `config/model.ts`, `http/threads.ts`    | Bootstrap fallback only — the one-time KB seed and thread title generation. See BYOK below. |
| `RAG_SCORE_THRESHOLD` | No — default `0.65` | `config/env.ts`                         | Minimum cosine similarity (0–1) a KB match must clear to be used as grounding.              |
| `PORT`                | No — default `8123` | `http/copilotkit.ts`, `pnpm start`      | Port the agent listens on.                                                                  |
| `AGENT_URL`           | No                  | `http/copilotkit.ts`                    | Deployment URL the CopilotKit runtime points its `LangGraphAgent` at.                       |
| `LANGSMITH_API_KEY`   | No                  | `http/copilotkit.ts`, `langgraphjs dev` | Tracing; passed to the agent and picked up by the CLI.                                      |
| `LANGSMITH_TRACING`   | No                  | `langgraphjs dev`                       | Turns tracing on for every graph run.                                                       |
| `LANGSMITH_PROJECT`   | No                  | `langgraphjs dev`                       | LangSmith project name.                                                                     |
| `LANGSMITH_ENDPOINT`  | No                  | `langgraphjs dev`                       | Override the LangSmith API host.                                                            |

## The HTTP surface

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
│   ├── errorHandler.ts   # nodeErrorHandler — last line of defence, attached to every node
│   ├── withNode.ts       # Shared try/catch every node runs behind (logging + retry semantics)
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
│   ├── index.ts             # Hono app: mounts the routers + middleware below
│   ├── copilotkit.ts        # CopilotKit runtime endpoint (/api/copilotkit)
│   ├── threadHistoryRunner.ts  # Custom AgentRunner — thread history via the LangGraph SDK
│   ├── emails.ts            # GET/PATCH /api/emails
│   ├── knowledge.ts         # GET /api/knowledge?query= — searchKnowledge over HTTP, no LLM turn
│   ├── threads.ts           # GET/POST/PATCH/DELETE /api/threads + LLM title generation
│   ├── schemas.ts           # Zod request/response schemas for the routes above
│   ├── types.ts             # AppEnv — Hono binding shared by the middleware below
│   └── middleware/
│       ├── requestContext.ts  # Correlation id per request, carried by every log line
│       ├── validate.ts        # Parses+validates json/query against a schemas.ts schema
│       └── errorHandler.ts    # Maps AppError to the HTTP error body
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
| `@repo/shared`                                       | workspace:\*   | Constants + `ChatThread` type, shared with `web` |
| `axios`                                              | ^1.19.0        | Direct OpenAI call for thread title-gen (`http/threads.ts`) |
| `@langchain/langgraph-sdk`                           | ^1.8.8         | `Client` — fetches thread history for `ThreadHistoryRunner` |
| `@ag-ui/client` / `rxjs`                             | 0.0.57 / 7.8.1 | AG-UI event types + `Observable` used by `ThreadHistoryRunner` |
| `pdf-parse` / `mammoth` / `@langchain/textsplitters` | —              | KB document loading and chunking            |
| `d3-dsv` / `word-extractor`                          | —              | Peer deps for `@langchain/community`'s CSV/`.doc` loaders  |
| TypeScript                                           | ^5.6.3         | `tsc --noEmit` via `pnpm typecheck`         |

## Tables it owns

All in the one Postgres behind `DATABASE_URL`, created on first connect:

- `emails` — the inbox
- `kb_documents` — the embedded knowledge base (pgvector)
- `checkpoints*` — graph checkpoints (`PostgresSaver`)
- `store*` — cross-thread memory (`PostgresStore`)
- `chat_threads` — the self-managed thread list (title, created/updated timestamps)

## Deploying

`Dockerfile` builds from the **repo root** as context so it can see the workspace lockfile, then
`pnpm deploy --filter=agent --prod` into a slim runtime image. `pnpm start` runs
`langgraphjs dev --host 0.0.0.0 --port $PORT`.
