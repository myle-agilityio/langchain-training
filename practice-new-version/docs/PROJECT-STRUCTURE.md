# Project Structure & Tech Stack

## Project Structure

```
├── apps/
│   ├── web/                          # Vite frontend
│   │   ├── src/
│   │   │   ├── app/                  # Page shell + A2UI catalog (definitions + renderers)
│   │   │   ├── components/
│   │   │   │   ├── emailInbox/       # Inbox list, detail view, compose form
│   │   │   │   ├── chatSidebar/      # Collapsible right-hand chat sidebar
│   │   │   │   ├── threadsMenu/      # Clock-icon dropdown: conversation history
│   │   │   │   └── generativeUi/     # Generative UI components
│   │   │   └── hooks/
│   │   │       └── useSharedInbox.ts  # Inbox data provider
│   │   ├── public/                   # Static assets
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── agent/                        # LangGraph TypeScript agent
│       ├── langgraph.json            # Graph entry + custom HTTP app + env file
│       ├── Dockerfile
│       └── src/
│           ├── agent.ts              # Agent entry point
│           ├── graphs/               # Graph definitions (main graph, compose-email subgraph)
│           ├── nodes/                # Node implementations
│           ├── prompts/              # Every prompt string
│           ├── tools/                # Tool definitions (emails, knowledge base, A2UI)
│           ├── state/                # StateSchema definitions
│           ├── types/                # Zod schemas + interfaces
│           ├── db/                   # Postgres pool, checkpointer, cross-thread store
│           ├── rag/                  # pgvector knowledge base (seed + semantic search)
│           ├── config/               # Env validation + model instances
│           ├── constants/            # Tool names, table names
│           └── utils/
├── docs/
│   └── TEST-SCENARIOS.md             # Scenarios the assistant is expected to handle
├── scripts/                          # Dev-server helper scripts
├── turbo.json                        # Task graph: typecheck, build, dev
├── pnpm-workspace.yaml               # packages: apps/*
├── vercel.json
└── package.json                      # Workspace root: turbo + cross-package scripts
```

## Technical Stack

**Frontend**

| Technology                                            | Version  |
| ----------------------------------------------------- | -------- |
| Next.js (App Router)                                  | 16.1.6   |
| React                                                 | 19.2.4   |
| TypeScript                                            | ^5       |
| Tailwind CSS                                          | ^4       |
| CopilotKit (`react-core`, `runtime`, `a2ui-renderer`) | 1.62.3   |
| Radix UI (`dialog`, `dropdown-menu`, `separator`)     | ^1.1–2.1 |
| Recharts                                              | ^3.7.0   |
| Zod                                                   | ^3.23.8  |

**Agent (`apps/agent/`)**

| Technology                                                                    | Version |
| ----------------------------------------------------------------------------- | ------- |
| TypeScript                                                                    | ^5.6.3  |
| LangGraph.js (`@langchain/langgraph`)                                         | 1.4.8   |
| LangGraph CLI (`langgraphjs dev`)                                             | 1.4.3   |
| LangChain (`langchain`)                                                       | 1.3.4   |
| `@langchain/core`                                                             | 1.1.49  |
| `@langchain/openai`                                                           | 1.4.4   |
| `@langchain/community` (`PGVectorStore`)                                      | ^1.1.29 |
| `@langchain/langgraph-checkpoint-postgres` (`PostgresSaver`, `PostgresStore`) | ^1.0.4  |
| CopilotKit SDK-JS                                                             | 1.62.3  |

**Data & infra**

| Technology                                       | Version                            |
| ------------------------------------------------ | ---------------------------------- |
| PostgreSQL + `pgvector` extension                | any Postgres supporting `pgvector` |
| `pg` (Postgres driver)                           | ^8.22.0                            |
| Hono (CopilotKit runtime HTTP layer)             | ^4.12.10                           |
| OpenAI (`gpt-4o-mini`, `text-embedding-3-small`) | —                                  |

## Development Tools

| Tool                                 | Version                               | Purpose                                                                       |
| ------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------- |
| Node.js                              | 20+                                   | JS runtime for both the Next.js app and the agent                             |
| pnpm                                 | 10.30.3 (pinned via `packageManager`) | Package manager — required (`apps/web` + `apps/agent` are one pnpm workspace) |
| `tsc` (`pnpm typecheck`)             | TypeScript ^5 / ^5.6.3                | Type-checks the Next.js app and the agent separately                          |
| `next lint`                          | Next.js 16.1.6                        | Lints the Next.js app                                                         |
| LangGraph Studio (`langgraphjs dev`) | LangGraph CLI 1.4.3                   | Local agent server + graph debugger on port `8123`                            |
