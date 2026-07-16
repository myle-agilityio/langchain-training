# AI Email Assistant — CopilotKit <> LangGraph (Practice)

A support-inbox triage assistant being built with [LangGraph](https://www.langchain.com/langgraph) and [CopilotKit](https://copilotkit.ai) as a training practice.
Target behavior: classify incoming email, research context, draft a reply or file a bug ticket, and always pause for human approval before anything is sent or created.

> **Status: Phase 1, Day 1 done.** See [docs/ROADMAP.md](./docs/ROADMAP.md) for what's
> built vs. planned, and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for how it's
> structured today. Collaboration rules are in [CLAUDE.md](./CLAUDE.md).

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

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) - project structure, current demo, mock inbox data
- [Roadmap](./docs/ROADMAP.md) - phase-by-phase plan and progress checklist
- [Estimation Tracking](./docs/ESTIMATION.md) - original per-task hour estimate vs. actual status, to catch schedule drift early
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
