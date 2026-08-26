# AI Email Assistant — CopilotKit <> LangGraph (Practice)

An inbox triage assistant for a high school math teacher, built with [LangGraph](https://www.langchain.com/langgraph) and [CopilotKit](https://copilotkit.ai). It classifies incoming email, grounds answers in a school-policy knowledge base, and drafts replies for the teacher to approve before anything sends.

## Team Size

1 Developer

## Timeline

30 Working Days (2026-07-15 to 2026-08-26)

## Author

My Le

## Plan

[LangChain/LangGraph Practice Plan - AI Inbox Mangement Assistant Application](https://docs.google.com/document/d/1x160_wm8LfrehY8Z4oTn0ErbDq93LimBUgjF_c6KNeY/edit?usp=sharing)

## Key Features

| Feature                           | Description                                                                                                                                                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🤖 **AI Chat Assistant**          | Conversational inbox-triage assistant for classifying, drafting, and sending replies (CopilotKit + LangGraph ReAct agent)                                                                                         |
| 📧 **Email Classification**       | Auto-tags topic, course, work type, and urgency via structured LLM output (Zod + `withStructuredOutput`)                                                                                                          |
| ✅ **Human-in-the-Loop Approval** | Editable draft cards with approve/reject before anything sends, using LangGraph `interrupt()` + `Command(resume)` pattern                                                                                         |
| 🔀 **Compose-Email Subgraph**     | Dedicated triage → research → draft → compliance pipeline as a nested `StateGraph`, so every reply is grounded and checked                                                                                        |
| 📚 **RAG-Grounded Replies**       | Policy and curriculum answers pulled from a pgvector knowledge base via semantic search (`PGVectorStore` + `text-embedding-3-small`)                                                                              |
| 🛡️ **Guardrails**                 | A `moderator` node hard-blocks unsafe/abusive chat input before it reaches the model, plus an advisory compliance check on every draft and regex-based PII redaction before any model call                        |
| 🎨 **Generative UI**              | Dynamic dashboards and approval cards rendered live in chat via A2UI, `useInterrupt`, and `useFrontendTool`                                                                                                       |
| 🧠 **Cross-thread Memory**        | Remembers sender tone and facts across conversations via a Postgres-backed `BaseStore`                                                                                                                            |
| 🔁 **Thread Durability**          | Resumable, restart-safe agent runs via a `PostgresSaver` checkpointer                                                                                                                                             |
| 💾 **PostgreSQL Persistence**     | Inbox, checkpoints, vector KB, and cross-thread store all live in one Postgres via a shared `pg.Pool`                                                                                                             |
| 🔑 **Bring Your Own Key**         | Each visitor supplies their own OpenAI key in the browser (`localStorage`, forwarded per-request via CopilotKit's `copilotkit_forwarded_headers`); no shared server-side key required for chat/classify/draft/RAG |

## Prerequisites

[![pnpm](https://img.shields.io/badge/pnpm-10.30.3-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/installation)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![OpenAI](https://img.shields.io/badge/OpenAI-API_key-412991?logo=openai&logoColor=white)](https://platform.openai.com/)

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

This installs both `apps/web` (the Vite app) and `apps/agent` in one pass — one pnpm workspace.

2. Copy the example environment files — **each app owns its own `.env`**, there is no root one:

```bash
cp apps/agent/.env.example apps/agent/.env
cp apps/web/.env.example apps/web/.env
```

Then update the required values in `apps/agent/.env`:

```bash
AGENT_URL=http://localhost:8123
DATABASE_URL=your-postgres-connection-string
```

An empty database is fine — tables, the `vector` extension, and seed data (sample emails, the
knowledge base) are all created automatically on first run.

The rest of `apps/agent/.env.example`'s values (`RAG_SCORE_THRESHOLD`, LangSmith tracing,
CopilotKit Intelligence) are optional — each has a comment explaining it right there in the file.

3. Start the development server:

```bash
pnpm dev
```

This starts both the Vite UI on port `3000` and the LangGraph agent on port `8123`.

## Available Scripts

Run from the repo root — all of these go through Turborepo:

| Script                    | Description                                                    |
| ------------------------- | -------------------------------------------------------------- |
| `dev`                     | Starts both UI and agent servers in development mode           |
| `dev:ui`                  | Starts only the Vite UI server (`:3000`)                       |
| `dev:agent`               | Starts only the LangGraph agent server (`:8123`)               |
| `typecheck`               | Type-checks both packages; must be clean before a task is done |
| `lint` / `lint:fix`       | ESLint across the workspace (flat config, `eslint.config.mjs`) |
| `format` / `format:check` | Prettier across the workspace                                  |
| `build`                   | Builds the UI for production (`apps/web/dist`)                 |
| `build:agent`             | Builds the agent image target (`langgraphjs build`)            |

## Project Structure

A [Turborepo](https://turborepo.com) + pnpm workspace with three packages. Each has its own
README covering its layout and stack:

```
├── apps/
│   ├── web/            # Vite SPA — inbox UI + CopilotKit chat  → apps/web/README.md
│   │   └── .env        # Web-only env, read by vite.config.ts at build/dev time
│   └── agent/          # LangGraph.js agent + Hono HTTP app     → apps/agent/README.md
│       └── .env        # Agent-only env, read via langgraph.json's "env": ".env"
├── packages/
│   └── shared/         # @repo/shared — tool names, ChatThread type, shared constants
├── docs/               # FEATURES, ARCHITECTURE, TEST-SCENARIOS
├── fixtures/           # Sample data for manual runs
├── turbo.json          # Task graph: dev, typecheck, build
├── pnpm-workspace.yaml # packages: apps/*, packages/*
├── eslint.config.mjs   # Flat config, workspace-wide
├── vercel.json         # Static UI deploy; /api/* rewritten to $AGENT_URL
└── package.json        # Root scripts, all delegating to turbo
```

### Shared tooling

| Tool               | Version                               | Purpose                                                    |
| ------------------ | ------------------------------------- | ---------------------------------------------------------- |
| Node.js            | 20+                                   | Runtime for both packages                                  |
| pnpm               | 10.30.3 (pinned via `packageManager`) | Package manager — required, the two apps are one workspace |
| Turborepo          | 2.10.11                               | Runs `dev`/`typecheck`/`build` across both packages        |
| TypeScript         | ^5                                    | `pnpm typecheck` — `tsc --noEmit` per package              |
| ESLint             | ^10.8.1                               | Flat config, workspace-wide                                |
| Prettier           | ^3.9.6                                | Formatting, workspace-wide                                 |
| husky + commitlint | —                                     | Commit-message check and the pre-push lint/format hook     |
| LangGraph Studio   | LangGraph CLI 1.4.3                   | Local agent server + graph debugger on `:8123`             |

## Documentation

- [CLAUDE.md](./CLAUDE.md) - collaboration rules and where things live
- [`apps/web` README](./apps/web/README.md) - the Vite UI: structure, state layers, and stack
- [`apps/agent` README](./apps/agent/README.md) - the LangGraph agent: graph, HTTP app, tables, and stack
- [Features](./docs/FEATURES.md) - what the assistant does, from the teacher's point of view
- [Architecture](./docs/ARCHITECTURE.md) - system, main graph, and `compose_email` subgraph diagrams
- [Error Handling](./docs/ERROR-HANDLING.md) - the error taxonomy and how HTTP/node/tool failures are caught and logged
- [Test Scenarios](./docs/TEST-SCENARIOS.md) - scenarios the assistant is expected to handle
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/) - Learn more about LangGraph and its features
- [CopilotKit Documentation](https://docs.copilotkit.ai) - Explore CopilotKit's capabilities

## Contributing

Feel free to submit issues and enhancement requests! This starter is designed to be easily extensible.

## License

This project is licensed under the MIT License — see the LICENSE file for details.

## Troubleshooting

### Agent Connection Issues

If the agent reports tool connection problems, make sure:

1. The LangGraph agent is running on port `8123`
2. You've entered a valid OpenAI key in the browser prompt (BYOK — `apps/agent/.env`'s
   `OPENAI_API_KEY` no longer powers chat, only KB seeding)
3. `DATABASE_URL` is set to a Postgres database with `pgvector`
4. Both servers started successfully

### Agent Dependencies

If you encounter agent import errors:

```bash
pnpm install
```

## CopilotKit Intelligence

This app is connected to the CopilotKit Intelligence project **practice-new-version**.
The project details are recorded in `.copilotkit/project.json`.

- **License:** a token can be stored in `COPILOTKIT_LICENSE_TOKEN` — in `apps/agent/.env` for
  the server, and in `apps/web/.env` for the UI's derived Threads flag
- **Currently disabled:** the token is commented out in both files. Enabling it hits an unresolved
  upstream bug in `IntelligenceAgent.connectAgent`'s realtime WebSocket transport (`verifyEvents`
  rejects the first event), which drops runs in production with `RUNNER_CONNECTION_DROPPED`.
  Leave it commented out until CopilotKit fixes this.
- **Threads without it:** with the token unset, `VITE_COPILOTKIT_THREADS_ENABLED`
  (derived in `apps/web/vite.config.ts`) resolves to `false` and the UI falls back to a
  self-managed thread list — the agent's `/api/threads` routes,
  `apps/web/src/hooks/useSelfManagedThreads.ts`, and
  `apps/web/src/components/ThreadsMenu` — backed by our own Postgres (a `chat_threads` table)
  instead of the Intelligence platform. Message history itself still comes from the graph's
  `PostgresSaver` checkpointer either way; this only replaces the list/rename/delete UI.
- **Run it:** install dependencies, set your env vars, then `pnpm dev`
- **Switch project:** run `copilotkit project select` from this directory

Learn more at https://docs.copilotkit.ai.
