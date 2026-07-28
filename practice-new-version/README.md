# AI Email Assistant — CopilotKit <> LangGraph (Practice, Restart)

An inbox triage assistant for a high school math teacher, built with [LangGraph](https://www.langchain.com/langgraph) and [CopilotKit](https://copilotkit.ai). Classifies incoming email, grounds answers in a school-policy knowledge base, and drafts replies for the teacher to approve before anything sends.

> **This is a from-scratch rebuild of the `practice/` project.** The UI, test scenarios, and
> config were carried over; the agent was rebuilt. See [CLAUDE.md](./CLAUDE.md) for
> collaboration rules and [docs/TEST-SCENARIOS.md](./docs/TEST-SCENARIOS.md) for what the
> assistant is expected to handle.

## Prerequisites

- Node.js 20+
- Any of the following package managers:
  - npm (default)
  - [pnpm](https://pnpm.io/installation)
  - [yarn](https://classic.yarnpkg.com/lang/en/docs/install/)
  - [bun](https://bun.sh/)
- OpenAI API Key (for the LangGraph agent)
- A Postgres database with the `pgvector` extension available (local install, or hosted —
  Neon/Supabase both support it). Neon enables `pgvector` by default; the app creates the
  extension, tables, and indexes itself on first connect.

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

This also installs the agent dependencies (via the `postinstall` script, which runs
`npm install` inside `agent/`).

2. Set up your environment variables:

```bash
cp .env.example .env
```

Then edit the `.env` file and add your OpenAI API key and database URL:

```bash
OPENAI_API_KEY=your-openai-api-key-here
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Everything persistent — the inbox, contact profiles, the embedded knowledge base, and graph
checkpoints — lives in this one Postgres database. Tables, indexes, and the `vector`
extension are created automatically on first connect; there's no migration step to run.

#### Getting a `DATABASE_URL`

Any Postgres with `pgvector` works. Pick one:

- **Neon (hosted, recommended — free tier, no local install):**
  1. Sign in at [console.neon.tech](https://console.neon.tech) and create a project.
  2. Open the project's **Dashboard → Connection Details**.
  3. Select the **pooled connection** (host contains `-pooler`) and copy the full
     `postgresql://...` string — it already includes `sslmode=require`.
  4. Paste it as `DATABASE_URL` in `.env`.
- **Local Postgres:** install Postgres (with the `pgvector` extension available), create a
  database, then use `postgresql://user:password@localhost:5432/dbname`.
- **Supabase:** Project Settings → Database → Connection string (URI). Supabase ships
  `pgvector` pre-installed.
- **Ask the project owner:** email My Le (my.le@asnet.com.vn) or Slack (my.le) for a shared    
  dev `DATABASE_URL`.

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

This will start both the UI (:3000) and agent (:8123) servers concurrently.

## Available Scripts

The following scripts can also be run using your preferred package manager:

- `dev` - Starts both UI and agent servers in development mode
- `dev:debug` - Starts development servers with debug logging enabled
- `dev:ui` - Starts only the Next.js UI server
- `dev:agent` - Starts only the LangGraph agent server
- `typecheck` - Type-checks the Next.js app (`npm run typecheck --prefix agent` for the agent)
- `lint` - Lints the Next.js app
- `build` - Builds the Next.js application for production
- `start` - Starts the production server
- `install:agent` - Installs agent (Node) dependencies

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

## A2UI — Agent-to-User Interface

The agent can generate rich, interactive UI surfaces declaratively via [A2UI](https://a2ui.org/specification/) instead of returning plain text: it sends a JSON description of the UI it wants, and the frontend turns it into real components.

### How it works

1. **Catalog** — component definitions (schema) paired with React renderers, registered once
   in `layout.tsx` via `<CopilotKit a2ui={{ catalog: demonstrationCatalog }}>`.
2. **Surface** — a rendered UI instance the agent creates and binds data to.
3. **Operations** — the agent's `generate_a2ui` tool (`agent/src/tools/a2ui.ts`) returns
   `render(operations=[...])`, streamed to the frontend via helpers in `agent/src/utils/a2ui.ts`.

Components and data are decided at runtime by the agent — there's no fixed-schema variant in
this project.

### Key files

| Purpose                              | Path                                               |
| ------------------------------------ | --------------------------------------------------- |
| Catalog definitions (Zod schemas)    | `src/app/declarative-generative-ui/definitions.ts` |
| Catalog renderers (React components) | `src/app/declarative-generative-ui/renderers.tsx`  |
| Catalog registration                 | `src/app/layout.tsx`                               |
| A2UI agent tool                      | `agent/src/tools/a2ui.ts`                          |
| A2UI operation helpers               | `agent/src/utils/a2ui.ts`                          |

### Adding a custom component

1. **Define** the component schema in `definitions.ts`:

   ```typescript
   MyWidget: {
     description: "A brief description for the agent.",
     props: z.object({ title: z.string(), value: z.number() }),
   },
   ```

2. **Render** it in `renderers.tsx`:

   ```typescript
   MyWidget: ({ props }) => (
     <div>{props.title}: {props.value}</div>
   ),
   ```

   Renderers are type-checked against the definitions — TypeScript will error if props don't match.

3. **Use it** from the agent — the component becomes available to `generate_a2ui` automatically.

### Further reading

- [A2UI Specification](https://a2ui.org/specification/)
- [CopilotKit A2UI Documentation](https://docs.copilotkit.ai)

## Documentation

- [CLAUDE.md](./CLAUDE.md) - collaboration rules and where things live
- [Test Scenarios](./docs/TEST-SCENARIOS.md) - scenarios the assistant is expected to handle
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/) - Learn more about LangGraph and its features
- [CopilotKit Documentation](https://docs.copilotkit.ai) - Explore CopilotKit's capabilities

## Contributing

Feel free to submit issues and enhancement requests! This starter is designed to be easily extensible.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Agent Connection Issues

If you see "I'm having trouble connecting to my tools", make sure:

1. The LangGraph agent is running on port 8123
2. Your OpenAI API key is set correctly
3. Both servers started successfully

### Agent Dependencies

If you encounter agent import errors:

```bash
npm run install:agent
```

## CopilotKit Intelligence

This app is connected to the CopilotKit Intelligence project **practice-new-version**
(recorded in `.copilotkit/project.json`). Intelligence adds durable threads,
message & event persistence, and analytics for your agent.

- **License:** a token is stored as `COPILOTKIT_LICENSE_TOKEN` in your `.env`.
- **Switch project:** run `copilotkit project select` from this directory.
- **Run it:** follow "Getting Started" above — install dependencies, set your
  keys in `.env`, then `npm run dev`.

Learn more at https://docs.copilotkit.ai.
