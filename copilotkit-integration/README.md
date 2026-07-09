# Email Triage Agent — CopilotKit <> LangGraph

A support-inbox triage agent built with [LangGraph](https://www.langchain.com/langgraph) and [CopilotKit](https://copilotkit.ai). The agent reads and classifies incoming emails, then either drafts a reply or files a bug ticket — always pausing for human approval before anything is sent or created.

## Prerequisites

- Node.js 20+
- Any of the following package managers:
  - npm (default)
  - [pnpm](https://pnpm.io/installation)
  - [yarn](https://classic.yarnpkg.com/lang/en/docs/install/)
  - [bun](https://bun.sh/)
- OpenAI API Key (for the LangGraph agent)

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

This also installs the agent dependencies via `npm install` inside `agent/`.

2. Set up your environment variables:

```bash
cp .env.example .env
```

Then edit the `.env` file and add your OpenAI API key:

```bash
OPENAI_API_KEY=your-openai-api-key-here
```

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

This will start both the UI and agent servers concurrently.

## Available Scripts

The following scripts can also be run using your preferred package manager:

- `dev` - Starts both UI and agent servers in development mode
- `dev:debug` - Starts development servers with debug logging enabled
- `dev:ui` - Starts only the Next.js UI server
- `dev:agent` - Starts only the LangGraph agent server
- `build` - Builds the Next.js application for production
- `start` - Starts the production server
- `install:agent` - Installs agent (Node) dependencies

## Project Structure

```
├── src/                              # Next.js frontend source
│   ├── app/
│   │   ├── page.tsx                  # Main page
│   │   └── api/copilotkit/           # CopilotKit API route
│   ├── components/
│   │   ├── example-canvas/           # Email inbox UI (list + detail panel)
│   │   ├── example-layout/           # Layout: chat + canvas side-by-side
│   │   └── generative-ui/            # Analysis card + reply/bug review cards
│   ├── hooks/
│   │   └── use-email-agent.tsx       # Registers the email analysis + human-in-the-loop review tools
│   └── types/
│       └── types.ts                  # Shared frontend Email / EmailClassification types
├── agent/                            # LangGraph TypeScript agent
│   ├── src/
│   │   ├── agent.ts                  # Agent entry point (createAgent), system prompt, state schema
│   │   └── tools/
│   │       └── emails/               # Email triage tools + state
│   │           ├── schema.ts         # Email / EmailClassification zod schemas
│   │           ├── seed-data.ts      # Mock inbox (10 seed emails)
│   │           ├── knowledge-base.ts # Mock KB used by search_knowledge_base
│   │           ├── tools.ts          # manage_emails, finalize_email, get_emails, search_knowledge_base
│   │           └── index.ts          # Barrel export
│   └── langgraph.json
├── scripts/                          # Agent run scripts
│   └── run-agent.sh / .bat
├── public/                           # Static assets
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Email Triage Agent

The main demo in this app is a shared inbox that a LangGraph agent triages, with a human always in the loop before anything is sent or filed. Enable **App mode** (top-right toggle) to see the inbox alongside the chat.

### Workflow

1. **Read** — the agent calls `get_emails` to read the shared inbox, and `manage_emails` to mark an email read.
2. **Classify** — the agent classifies intent (`question` / `bug` / `billing` / `feature` / `complex`) and urgency, records it via `manage_emails`, and shows it inline via the `showEmailAnalysis` generative UI card.
3. **Act, gated by human review:**
   - **Bug** → `createBugTicket` pauses for approval. Once approved, the agent drafts a short customer notification and records both the ticket id and the reply in one `finalize_email` call — no second approval, since the human already approved by approving the ticket.
   - **Everything else** → the agent drafts a reply and calls `composeReply`, which pauses for approval (with inline editing) before `finalize_email` records it as sent.
4. `manage_emails`'s schema deliberately excludes the `replied` / `bug_filed` statuses — `finalize_email` is the only way to reach them, and it's only ever called after a human-in-the-loop tool confirms approval. This makes review structurally required, not just prompted.

### Key files

| Purpose                                    | Path                                          |
| ------------------------------------------- | ---------------------------------------------- |
| Email inbox list + detail panel             | `src/components/example-canvas/`               |
| Analysis / reply-review / bug-review cards  | `src/components/generative-ui/email-*.tsx`     |
| Human-in-the-loop tool registration         | `src/hooks/use-email-agent.tsx`                |
| Shared frontend `Email` type                | `src/types/types.ts`                           |
| Agent state schema + system prompt          | `agent/src/agent.ts`                           |
| Email schema, seed data, tools              | `agent/src/tools/emails/`                      |

## Documentation

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

This app is connected to the CopilotKit Intelligence project **coplotkit-integration**
(recorded in `.copilotkit/project.json`). Intelligence adds durable threads,
message & event persistence, and analytics for your agent.

- **License:** a token is stored as `COPILOTKIT_LICENSE_TOKEN` in your `.env`.
- **Switch project:** run `copilotkit project select` from this directory.
- **Run it:** follow "Getting Started" above — install dependencies, set your
  keys in `.env`, then `npm run dev`.

Learn more at https://docs.copilotkit.ai.
