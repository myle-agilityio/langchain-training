# AI Email Assistant — CopilotKit <> LangGraph (Practice)

An inbox triage assistant for a high school math teacher, built with [LangGraph](https://www.langchain.com/langgraph) and [CopilotKit](https://copilotkit.ai). It classifies incoming email, grounds answers in a school-policy knowledge base, and drafts replies for the teacher to approve before anything sends.

> **This is a from-scratch rebuild of the `practice/` project.** The UI, test scenarios, and config were carried over; the agent was rebuilt. See [CLAUDE.md](./CLAUDE.md) for collaboration rules and [docs/TEST-SCENARIOS.md](./docs/TEST-SCENARIOS.md) for the scenarios the assistant is expected to handle.

## Prerequisites

- Node.js 20+
- Any of the following package managers:
  - npm (default)
  - [pnpm](https://pnpm.io/installation)
  - [yarn](https://classic.yarnpkg.com/lang/en/docs/install/)
  - [bun](https://bun.sh/)
- OpenAI API key for the LangGraph agent
- A Postgres database with the `pgvector` extension available. Any Postgres works: local install, Neon, Supabase, etc.

## Getting Started

1. Install dependencies using your preferred package manager:

```bash
# Using npm (default)
npm install

# Using pnpm
pnpm install

# Using yarn
yarn install

# Using bun
bun install
```

The root install also runs the `postinstall` hook, which installs agent dependencies inside `agent/`.

2. Copy the example environment file and edit `.env`:

```bash
cp .env.example .env
```

Then update the required values:

```bash
AGENT_URL=http://localhost:8123
OPENAI_API_KEY=your-openai-api-key-here
```

Optional environment values in `.env.example` include:

- `LANGSMITH_API_KEY` / `LANGSMITH_TRACING` / `LANGSMITH_PROJECT`
- `COPILOTKIT_LICENSE_TOKEN`
- `INTELLIGENCE_API_URL`
- `INTELLIGENCE_GATEWAY_WS_URL`
- `INTELLIGENCE_API_KEY`

Everything persistent — the inbox, contact profiles, embedded knowledge base, graph checkpoints, and cross-thread store — lives in the Postgres database behind `DATABASE_URL`. Tables, indexes, and the `vector` extension are created automatically on first connect.

3. Start the development server:

```bash
# Using npm (default)
npm run dev

# Using pnpm
pnpm dev

# Using yarn
yarn dev

# Using bun
bun run dev
```

This starts both the Next.js UI on port `3000` and the LangGraph agent on port `8123`.

## Available Scripts

- `dev` - Starts both UI and agent servers in development mode
- `dev:debug` - Starts both development servers with debug logging enabled
- `dev:ui` - Starts only the Next.js UI server
- `dev:agent` - Starts only the LangGraph agent server
- `dev:infra` - Starts CopilotKit development infrastructure
- `typecheck` - Type-checks the Next.js app (`npm run typecheck --prefix agent` for the agent)
- `lint` - Lints the Next.js app
- `build` - Builds the Next.js application for production
- `start` - Starts the production server
- `install:agent` - Installs agent dependencies inside `agent/`

If agent dependencies fail to install automatically, run:

```bash
npm run install:agent
```

## Project Structure

```
├── src/                              # Next.js frontend
│   ├── app/
│   │   ├── page.tsx                  # Main page (chat + inbox side-by-side)
│   │   ├── api/copilotkit/           # CopilotKit runtime route
│   │   ├── api/emails/               # Reads the inbox directly from Postgres
│   │   └── declarative-generative-ui/ # A2UI catalog: definitions + renderers
│   ├── components/
│   │   ├── email-inbox/              # Inbox list, detail view, compose form
│   │   ├── example-layout/           # Layout: chat + canvas side-by-side
│   │   └── generative-ui/            # Generative UI components
│   └── hooks/
│       └── use-shared-inbox.tsx      # Inbox data provider
├── agent/                            # LangGraph TypeScript agent
│   └── src/
│       ├── agent.ts                  # Agent entry point
│       ├── graphs/                   # Graph definitions (main graph, compose-email subgraph)
│       ├── nodes/                    # Node implementations
│       ├── prompts/                  # Every prompt string
│       ├── tools/                    # Tool definitions (emails, knowledge base, A2UI)
│       ├── state/                    # StateSchema definitions
│       ├── types/                    # Zod schemas + interfaces
│       ├── db/                       # Postgres pool, checkpointer, cross-thread store
│       ├── rag/                      # pgvector knowledge base (seed + semantic search)
│       ├── config/                   # Env validation + model instances
│       ├── constants/                # Tool names, table names
│       └── utils/
├── docs/
│   └── TEST-SCENARIOS.md             # Scenarios the assistant is expected to handle
├── scripts/                          # Dev-server helper scripts
├── public/                           # Static assets
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - collaboration rules and where things live
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
2. Your OpenAI API key is set correctly in `.env`
3. `DATABASE_URL` is set to a Postgres database with `pgvector`
4. Both servers started successfully

### Agent Dependencies

If you encounter agent import errors:

```bash
npm run install:agent
```

## CopilotKit Intelligence

This app is connected to the CopilotKit Intelligence project **practice-new-version**.
The project details are recorded in `.copilotkit/project.json`.

- **License:** a token can be stored in `COPILOTKIT_LICENSE_TOKEN` in `.env`
- **Run it:** install dependencies, set your env vars, then `npm run dev`
- **Switch project:** run `copilotkit project select` from this directory

Learn more at https://docs.copilotkit.ai.
