# Architecture & Current State

What's actually built, as of **Phase 1, Day 1**. See [ROADMAP.md](./ROADMAP.md) for what's
planned but not built yet, and the root [README](../README.md) for setup/running.

## Project Structure

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
