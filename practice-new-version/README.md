# AI Email Assistant — CopilotKit <> LangGraph (Practice)

An inbox triage assistant for a high school math teacher, built with [LangGraph](https://www.langchain.com/langgraph) and [CopilotKit](https://copilotkit.ai). It classifies incoming email, grounds answers in a school-policy knowledge base, and drafts replies for the teacher to approve before anything sends.

## Team Size

1 Developer

## Timeline

16 Days

## Author

My Le

## Plan

[LangChain/LangGraph Practice Plan - AI Inbox Mangement Assistant Application](https://docs.google.com/document/d/1x160_wm8LfrehY8Z4oTn0ErbDq93LimBUgjF_c6KNeY/edit?usp=sharing)

## Key Features

- 🤖 **AI Chat Assistant** — conversational inbox-triage assistant for classifying, drafting, and sending replies (CopilotKit + LangGraph ReAct agent)
- 📧 **Email Classification** — auto-tags topic, course, work type, and urgency via structured LLM output (Zod + `withStructuredOutput`)
- ✅ **Human-in-the-Loop Approval** — editable draft cards with approve/reject before anything sends, using LangGraph `interrupt()` + `Command(resume)` pattern
- 🔀 **Compose-Email Subgraph** — dedicated triage → research → draft → compliance pipeline as a nested `StateGraph`, so every reply is grounded and checked
- 📚 **RAG-Grounded Replies** — policy and curriculum answers pulled from a pgvector knowledge base via semantic search (`PGVectorStore` + `text-embedding-3-small`)
- 🛡️ **Guardrails** — a `moderator` node hard-blocks unsafe/abusive chat input before it reaches the model, plus an advisory compliance check on every draft and regex-based PII redaction before any model call
- 🎨 **Generative UI** — dynamic dashboards and approval cards rendered live in chat via A2UI, `useInterrupt`, and `useFrontendTool`
- 🧠 **Cross-thread Memory** — remembers sender tone and facts across conversations via a Postgres-backed `BaseStore`
- 🔁 **Thread Durability** — resumable, restart-safe agent runs via a `PostgresSaver` checkpointer
- 💾 **PostgreSQL Persistence** — inbox, checkpoints, vector KB, and cross-thread store all live in one Postgres via a shared `pg.Pool`
- 🔑 **Bring Your Own Key** — each visitor supplies their own OpenAI key in the browser (`localStorage`, forwarded per-request via CopilotKit's `copilotkit_forwarded_headers`); no shared server-side key required for chat/classify/draft/RAG

## Prerequisites

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-4169E1?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![OpenAI](https://img.shields.io/badge/OpenAI-API_key-412991?logo=openai&logoColor=white)](https://platform.openai.com/)

[![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/installation)

`apps/web` and `apps/agent` are one [pnpm workspace](https://pnpm.io/workspaces) — pnpm is required, not
just preferred (npm/yarn won't resolve the workspace lockfile).

- A Postgres database with the `pgvector` extension available — local install, Neon, Supabase, etc. all work.
  - Setting up your own is optional — please contact the author (My Le) to get a shared `DATABASE_URL`.
- An OpenAI API key — BYOK: each visitor pastes their own into the browser prompt on first
  load (stored only in that browser's `localStorage`), so you don't need to set one up front to
  run the app. `.env`'s `OPENAI_API_KEY` is now optional, used only to seed the shared
  knowledge base on a brand-new database and as a fallback for `/api/threads`' title generation.

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

This installs both `apps/web` (the Vite app) and `apps/agent` in one pass — one pnpm workspace.

2. Copy the example environment file and edit `.env`:

```bash
cp .env.example .env
```

Then update the required values:

```bash
AGENT_URL=http://localhost:8123
DATABASE_URL=your-postgres-connection-string
```

You'll be prompted for an OpenAI key in the browser the first time you open the app — that's
what actually powers chat/classify/draft/RAG, not anything in `.env`.

Optional environment values in `.env.example` include:

- `OPENAI_API_KEY` — bootstrap-only now (see "Prerequisites" above)
- `LANGSMITH_API_KEY` / `LANGSMITH_TRACING` / `LANGSMITH_PROJECT`
- `COPILOTKIT_LICENSE_TOKEN`
- `INTELLIGENCE_API_URL`
- `INTELLIGENCE_GATEWAY_WS_URL`
- `INTELLIGENCE_API_KEY`

The Intelligence ones are commented out by default — see "CopilotKit Intelligence" below for why.

Everything persistent — the inbox, contact profiles, embedded knowledge base, graph checkpoints, and cross-thread store — lives in the Postgres database behind `DATABASE_URL`. Tables, indexes, and the `vector` extension are created automatically on first connect.

3. Start the development server:

```bash
pnpm dev
```

This starts both the Next.js UI on port `3000` and the LangGraph agent on port `8123`.

## Available Scripts

- `dev` - Starts both UI and agent servers in development mode
- `dev:debug` - Starts both development servers with debug logging enabled
- `dev:ui` - Starts only the Next.js UI server
- `dev:agent` - Starts only the LangGraph agent server
- `dev:infra` - Starts CopilotKit development infrastructure
- `typecheck` - Type-checks the Next.js app (`pnpm --filter agent typecheck` for the agent)
- `lint` - Lints the Next.js app
- `build` - Builds the Next.js application for production
- `start` - Starts the production server

If agent dependencies fail to install automatically, run:

```bash
pnpm install
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - collaboration rules and where things live
- [Project Structure & Tech Stack](./docs/PROJECT-STRUCTURE.md) - directory layout, technical stack, and development tools with versions
- [Features](./docs/FEATURES.md) - what the assistant does, from the teacher's point of view
- [Architecture](./docs/ARCHITECTURE.md) - system, main graph, and `compose_email` subgraph diagrams
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
2. You've entered a valid OpenAI key in the browser prompt (BYOK — `.env`'s `OPENAI_API_KEY`
   no longer powers chat, only KB seeding)
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

- **License:** a token can be stored in `COPILOTKIT_LICENSE_TOKEN` in `.env`
- **Currently disabled:** the token is commented out in `.env`. Enabling it hits an unresolved
  upstream bug in `IntelligenceAgent.connectAgent`'s realtime WebSocket transport (`verifyEvents`
  rejects the first event), which drops runs in production with `RUNNER_CONNECTION_DROPPED`.
  Leave it commented out until CopilotKit fixes this.
- **Threads without it:** with the token unset, `NEXT_PUBLIC_COPILOTKIT_THREADS_ENABLED`
  (`next.config.ts`) resolves to `false` and the UI falls back to a self-managed thread list —
  `src/app/api/threads`, `src/hooks/useSelfManagedThreads.ts`,
  `src/components/self-managed-threads` — backed by our own Postgres (a `chat_threads` table)
  instead of the Intelligence platform. Message history itself still comes from the graph's
  `PostgresSaver` checkpointer either way; this only replaces the list/rename/delete UI.
- **Run it:** install dependencies, set your env vars, then `pnpm dev`
- **Switch project:** run `copilotkit project select` from this directory

Learn more at https://docs.copilotkit.ai.
