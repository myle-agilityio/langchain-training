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

## Evals

[Evalite](https://www.evalite.dev/) scores the agent's structured-output LLM calls against fixture
datasets, so a prompt change that breaks classification/moderation/compliance shows up before it
hits the graph. Suites live in `evals/*.eval.ts`, one file per node/tool. They call the LLM through
`evals/evalModel.ts`, which reads `OPENAI_API_KEY` directly — evals don't run inside a real
request, so they can't use the app's BYOK trick of forwarding the teacher's key from a header.
So **you must set `OPENAI_API_KEY` yourself to run these**, even though the app itself doesn't
require it (see BYOK below).

```bash
pnpm --filter agent eval:dev     # watch mode, local UI at localhost:3006 — recommended day-to-day
pnpm --filter agent eval         # run once, results table in the terminal — CI mode
pnpm --filter agent eval:report  # static HTML snapshot in evalite-export/ — serve it, don't open the file directly
```

Every run makes real OpenAI calls billed to `OPENAI_API_KEY` — there's no mock mode. `EVAL_MODEL`
(optional, default `gpt-4o-mini`) picks which model the suites run against.

| Suite                     | Covers                                                            |
| ------------------------- | ----------------------------------------------------------------- |
| `classifyEmail.eval.ts`   | `tools/classifyEmails.ts` — topic/course/workType/urgency         |
| `moderator.eval.ts`       | `nodes/moderator.ts` — flagged vs. not-flagged                    |
| `checkCompliance.eval.ts` | `nodes/composeEmail/checkCompliance.ts` — compliant vs. violation |

`composeEmail/triage.ts`'s research decision and `writeDraft.ts` aren't covered yet.

## Environment

| Variable              | Required                   | Read by                                                    | Purpose                                                                                                                                 |
| --------------------- | -------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | **Yes**                    | `config/env.ts`                                            | The one Postgres holding inbox, KB, checkpoints, and store. Throws on startup if unset.                                                 |
| `OPENAI_API_KEY`      | No — **Yes** for `evals/`  | `config/model.ts`, `http/threads.ts`, `evals/evalModel.ts` | Bootstrap fallback for the app (KB seed, title-gen; see BYOK below) — but `evals/` has no BYOK fallback, so it's required to run those. |
| `RAG_SCORE_THRESHOLD` | No — default `0.65`        | `config/env.ts`                                            | Minimum cosine similarity (0–1) a KB match must clear to be used as grounding.                                                          |
| `PORT`                | No — default `8123`        | `http/copilotkit.ts`, `pnpm start`                         | Port the agent listens on.                                                                                                              |
| `AGENT_URL`           | No                         | `http/copilotkit.ts`                                       | Deployment URL the CopilotKit runtime points its `LangGraphAgent` at.                                                                   |
| `LANGSMITH_API_KEY`   | No                         | `http/copilotkit.ts`, `langgraphjs dev`                    | Tracing; passed to the agent and picked up by the CLI.                                                                                  |
| `LANGSMITH_TRACING`   | No                         | `langgraphjs dev`                                          | Turns tracing on for every graph run.                                                                                                   |
| `LANGSMITH_PROJECT`   | No                         | `langgraphjs dev`                                          | LangSmith project name.                                                                                                                 |
| `LANGSMITH_ENDPOINT`  | No                         | `langgraphjs dev`                                          | Override the LangSmith API host.                                                                                                        |
| `EVAL_MODEL`          | No — default `gpt-4o-mini` | `evals/evalModel.ts`                                       | Model the `evals/` suites (`pnpm eval` / `eval:dev`) run against.                                                                       |

## The HTTP surface

`langgraph.json` registers three things:

| Key        | Value                                                       | What it is                                   |
| ---------- | ----------------------------------------------------------- | -------------------------------------------- |
| `graphs`   | `./src/index.ts:graph`                                      | `inbox_assistant` — the main graph           |
| `graphs`   | `./src/graphs/composeEmailSubgraph.ts:composeEmailSubgraph` | `compose_email_debug` — subgraph, for Studio |
| `http.app` | `./src/http/index.ts:app`                                   | Hono app merged into the dev server's routes |

## Structure

```
evals/                    # Evalite suites — one *.eval.ts per LLM node/tool being scored
├── evalModel.ts           # Plain ChatOpenAI off OPENAI_API_KEY (no LangGraphRunnableConfig here)
├── classifyEmail.eval.ts
├── moderator.eval.ts
└── checkCompliance.eval.ts
evalite.config.ts          # setupFiles: dotenv/config — loads .env for eval runs
vitest.config.ts           # "@/*" alias to src/ — evalite runs on Vitest, which ignores tsconfig paths
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
│   └── model.ts          # EMBEDDING_MODEL + per-request key/chat-model resolution (BYOK)
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

| Package                                              | Version          | Role                                                                         |
| ---------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| `@langchain/langgraph`                               | 1.4.8            | StateGraph, subgraphs, `interrupt()`                                         |
| `@langchain/langgraph-cli`                           | 1.4.3            | `langgraphjs dev` — server + Studio                                          |
| `langchain` / `@langchain/core`                      | 1.3.4 / 1.1.49   | Messages, tools, structured output                                           |
| `@langchain/openai`                                  | 1.4.4            | Chat (teacher-picked model, default `gpt-4o-mini`), `text-embedding-3-small` |
| `@langchain/community`                               | ^1.1.29          | `PGVectorStore`                                                              |
| `@langchain/langgraph-checkpoint-postgres`           | ^1.0.4           | `PostgresSaver`, `PostgresStore`                                             |
| `@copilotkit/runtime` / `@copilotkit/sdk-js`         | 1.62.3           | CopilotKit endpoint + state schema                                           |
| `hono`                                               | ^4.12.10         | The custom HTTP app                                                          |
| `pg`                                                 | ^8.22.0          | Postgres driver (one shared pool)                                            |
| `zod`                                                | ^3.23.8          | Tool args, structured output, state schemas                                  |
| `@repo/shared`                                       | workspace:\*     | Constants + `ChatThread` type, shared with `web`                             |
| `axios`                                              | ^1.19.0          | Direct OpenAI call for thread title-gen (`http/threads.ts`)                  |
| `@langchain/langgraph-sdk`                           | ^1.8.8           | `Client` — fetches thread history for `ThreadHistoryRunner`                  |
| `@ag-ui/client` / `rxjs`                             | 0.0.57 / 7.8.1   | AG-UI event types + `Observable` used by `ThreadHistoryRunner`               |
| `pdf-parse` / `mammoth` / `@langchain/textsplitters` | —                | KB document loading and chunking                                             |
| `d3-dsv` / `word-extractor`                          | —                | Peer deps for `@langchain/community`'s CSV/`.doc` loaders                    |
| TypeScript                                           | ^5.6.3           | `tsc --noEmit` via `pnpm typecheck`                                          |
| `evalite` / `vitest`                                 | ^0.19.0 / ^5.0.0 | `evals/*.eval.ts` runner + local scoring UI (`pnpm eval` / `eval:dev`)       |
| `dotenv`                                             | ^17.4.2          | Loads `.env` for eval runs (`evalite.config.ts`'s `setupFiles`)              |

## Tables it owns

All in the one Postgres behind `DATABASE_URL`, created on first connect:

- `emails` — the inbox
- `kb_documents` — the embedded knowledge base (pgvector)
- `checkpoints*` — graph checkpoints (`PostgresSaver`)
- `store*` — cross-thread memory (`PostgresStore`)
- `chat_threads` — the self-managed thread list (title, full-conversation content for search,
  created/updated timestamps)

## Deploying

`Dockerfile` builds from the **repo root** as context so it can see the workspace lockfile, then
`pnpm deploy --filter=agent --prod` into a slim runtime image. `pnpm start` runs
`langgraphjs dev --host 0.0.0.0 --port $PORT`.
