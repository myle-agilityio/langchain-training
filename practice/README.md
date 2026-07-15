# AI Email Assistant — CopilotKit <> LangGraph (Practice)

A support-inbox triage assistant being built with [LangGraph](https://www.langchain.com/langgraph) and [CopilotKit](https://copilotkit.ai) as a training practice. Target behavior: classify incoming email, research context, draft a reply or file a bug ticket, and always pause for human approval before anything is sent or created.

> **Status: Phase 1, Day 1 done.** The agent reads/patches a mock shared inbox and can
> look up support articles before answering — see [Current demo](#current-demo). No
> drafting, human-approval, or UI work has started; the app still renders the starter's
> generic layout, just backed by email state instead of todos. Full scope is in
> [Roadmap](#roadmap); collaboration rules are in [CLAUDE.md](./CLAUDE.md).

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

Reflects what's actually in the repo today (starter boilerplate, pre-email-assistant):

```
├── src/                              # Next.js frontend source
│   ├── app/
│   │   ├── page.tsx                  # Main page
│   │   ├── api/copilotkit/           # CopilotKit API route (runtime, agent registration)
│   │   └── declarative-generative-ui/# a2ui catalog: definitions.ts + renderers.tsx
│   ├── components/
│   │   ├── example-canvas/           # Todo list UI
│   │   ├── example-layout/           # Layout: chat + canvas side-by-side
│   │   └── generative-ui/            # Charts + meeting-time-picker demo components
│   ├── hooks/                        # use-generative-ui-examples, use-example-suggestions, use-theme
│   └── lib/                          # a2ui-theme.css, utils
├── agent/                            # LangGraph TypeScript agent
│   ├── src/
│   │   ├── agent.ts                  # Agent entry point (createAgent), state schema, system prompt
│   │   ├── a2ui.ts                   # A2UI operation helpers
│   │   ├── a2ui_dynamic_schema.ts    # Dynamic-schema A2UI tool (generated dashboards)
│   │   └── tools/emails/             # Email domain — wired into agent.ts
│   │       ├── schema.ts             # Email / classification zod schemas
│   │       ├── seed-data.ts          # Generated mock inbox (14 emails)
│   │       ├── knowledge-base.ts     # Mock KB + search_knowledge_base's keyword search
│   │       ├── tools.ts              # get_emails, manage_emails, search_knowledge_base
│   │       └── index.ts              # Barrel export
│   ├── scripts/
│   │   └── generate-seed-emails.ts   # Regenerates seed-data.ts — see below
│   └── langgraph.json
├── scripts/                          # Agent run scripts
│   └── run-agent.sh / .bat
├── public/                           # Static assets
├── next.config.ts
├── tsconfig.json
└── package.json
```

## Current demo

The agent (`agent/src/agent.ts`) is a single `createAgent` (LangChain.js) wired to
CopilotKit, with three email tools plus the starter's dynamic-dashboard A2UI tool:

- `get_emails` — reads the shared inbox (defaults to the 14 seed emails on a fresh thread)
- `manage_emails` — patches emails by id (mark read/unread, record a classification);
  cannot set `replied`/`bug_filed` — those need a human-approved finalize step that
  doesn't exist yet
- `search_knowledge_base` — keyword search over a mock support-article KB
- `generate_a2ui` — the starter's LLM-generated dashboard tool, left in as-is

There's no frontend UI for any of this yet — the app still renders the starter's generic
todo-list layout, unrelated to the email state. Verified so far via direct `graph.invoke`
calls (not the UI): classification + mark-read + KB-grounded summarization all work
end-to-end in one turn.

## Mock inbox data

`agent/src/tools/emails/seed-data.ts` is 14 support emails for a fictional product
("Vela") covering every classification target (question / bug / billing / feature /
complex, mixed urgency). It's generated, not hand-written: `agent/scripts/generate-seed-emails.ts`
builds a structured "brief" per email with faker (customer, invoice ref, platform, date —
fixed seed, so structure is reproducible), then has an LLM write the actual subject/body
prose so the language is varied instead of templated. Output is validated against the
`Email` zod schema before it's written, so a bad generation fails loudly rather than
shipping broken fixtures.

Regenerate with (from `agent/`):

```bash
npm run generate:seed
```

This overwrites `seed-data.ts` — hand edits made after generating will be lost on a rerun.

## Roadmap

Building the email assistant in two phases (see [CLAUDE.md](./CLAUDE.md) for how we work,
and the practice plan for full day-by-day scope):

- **Phase 1 — Foundation & core assistant.** Reuse this boilerplate's tools, shared-state,
  and a2ui-catalog patterns; swap the demo domain for email. Ships: classification,
  document lookup, drafting with real human-in-the-loop approval, manual compose.
  - [x] Email schema + generated mock inbox (`agent/src/tools/emails/`)
  - [x] Read/patch/lookup tools (`get_emails`, `manage_emails`, `search_knowledge_base`)
        wired into `agent.ts`; classification and document lookup work via these tools
  - [ ] Drafting + real human-in-the-loop approval, manual compose, inbox/card UI
- **Phase 2 — Context, memory & multi-agent.** Migrate `createAgent` to an explicit
  LangGraph `StateGraph`; add short/long-term memory, PII/tone guardrails, time-travel
  replay, multi-tone forked drafts, and agent handoff.

This section will be updated as each phase ships, per the README rule in CLAUDE.md.

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
