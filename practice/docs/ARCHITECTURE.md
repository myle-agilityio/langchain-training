# Architecture & Current State

What's actually built, as of **Phase 1, Day 3**. See [ROADMAP.md](./ROADMAP.md) for what's
planned but not built yet, and the root [README](../README.md) for setup/running.

## Project Structure

```
├── src/                              # Next.js frontend source
│   ├── app/
│   │   ├── page.tsx                  # Main page — calls useEmailAgent() alongside the demo hooks
│   │   ├── api/copilotkit/           # CopilotKit API route (runtime, agent registration)
│   │   └── declarative-generative-ui/# a2ui catalog: definitions.ts + renderers.tsx
│   ├── components/
│   │   ├── email-inbox/               # Inbox list + detail panel + manual (non-agent) reply form
│   │   ├── example-canvas/           # Todo list UI (kept as a demo reference; no longer mounted in page.tsx)
│   │   ├── example-layout/           # Layout: chat + canvas side-by-side
│   │   └── generative-ui/            # Charts, meeting-time-picker, email-reply-card
│   ├── hooks/                        # use-email-agent, use-generative-ui-examples, use-example-suggestions, use-theme
│   ├── types/email.ts                # Frontend Email type — mirrors agent/.../schema.ts, no shared import boundary between the two TS projects
│   └── lib/                          # a2ui-theme.css, utils
├── agent/                            # LangGraph TypeScript agent
│   ├── src/
│   │   ├── agent.ts                  # Agent entry point (createAgent), state schema, system prompt
│   │   ├── a2ui.ts                   # A2UI operation helpers
│   │   ├── a2ui_dynamic_schema.ts    # Dynamic-schema A2UI tool (generated dashboards)
│   │   └── tools/emails/             # Email domain — wired into agent.ts
│   │       ├── schema.ts             # Email / classification / reply zod schemas
│   │       ├── seed-data.ts          # Generated mock inbox (14 emails)
│   │       ├── knowledge-base.ts     # Mock KB + search_knowledge_base's keyword search
│   │       ├── tools.ts              # get_emails, manage_emails, compose_reply, search_knowledge_base
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

`agent/src/agent.ts` is a single `createAgent` wired to CopilotKit, with four email tools
plus the starter's dashboard tool:

- `get_emails` — reads the shared inbox
- `manage_emails` — patches status/classification by id; can't set `replied`/`bug_filed`
- `compose_reply` — pauses via `copilotKitInterrupt` for approval; returns the decision but
  doesn't apply it (see below)
- `search_knowledge_base` — keyword search over a mock KB
- `generate_a2ui` — starter's dashboard tool, untouched

Frontend: `use-email-agent.tsx` + `email-reply-card.tsx` render an editable
Approve/Reject card via `useHumanInTheLoop`. Verified end-to-end in a real browser: draft
→ card renders → approve → backend state confirmed `status: "replied"`.

`email-inbox/` is the app-mode content (`page.tsx`'s `appContent`, replacing the old todo
canvas): a two-pane list + detail view over `agent.state.emails`. Selecting a row marks it
read; the detail panel's "Compose reply" button opens a manual draft form (subject/body)
that sends by writing `status: "replied"` + `reply` straight to shared state via
`agent.setState` — the same frontend-mutates-shared-state pattern `EmailReplyCard`'s
approve handler uses, just without any agent/interrupt round-trip at all, per the
"manual compose" requirement (user drafts/sends without going through the agent).

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

## Known issue: dev agent server crashes on every run

`agent/node_modules` currently has a broken/conflicting dependency resolution —
`@langchain/langgraph-checkpoint` resolves to `0.0.0` in one place (required
`~0.0.16 || ^0.1.0 || ~1.0.0`), and `npm ls` also flags `@langchain/langgraph-cli`,
`langchain`, and `@langchain/langgraph` as "invalid" (version conflicts) inside the
pnpm-managed store. In practice this makes `POST /threads/{id}/runs/stream` — the
endpoint the CopilotKit frontend uses for every chat turn — crash inside
`preprocessDebugCheckpoint` (`@langchain/langgraph-api`'s `stream.mjs`) on the very
first debug event of any run, so the browser never receives a state update and every
chat message effectively no-ops from the UI's perspective.

The graph itself is NOT broken: a direct `POST /threads/{id}/runs/wait` against the
LangGraph dev server (bypassing the streaming endpoint) completes fine and correctly
hydrates `state.emails` with the 14 seed emails, proving the crash is isolated to the
stream/debug-checkpoint code path, not the agent logic. This blocks live-browser
verification of any chat-driven flow (classification, `compose_reply`, etc.) until the
dependency tree is reconciled — likely needs a clean `pnpm install` in `agent/` rather
than the `npm install`/`npm ls` used to diagnose this, since the repo mixes both
lockfiles (`package-lock.json` and `pnpm-lock.yaml` at root; `agent/node_modules` is
pnpm-shaped but `agent/package-lock.json` also exists).
