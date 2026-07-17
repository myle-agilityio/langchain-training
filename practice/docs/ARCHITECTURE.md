# Architecture & Current State

What's actually built, as of **Phase 1 complete (end of Day 3)**. See
[ROADMAP.md](./ROADMAP.md) for what's planned but not built yet, and the root
[README](../README.md) for setup/running.

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

`example-layout/index.tsx`'s mode defaults to `"app"` rather than `"chat"` — this is an
email client first, so the inbox + chat should both be visible on load instead of
landing on an empty chat screen. The Chat/App toggle still lets you go chat-only (mobile
in particular, where app mode hides the chat pane entirely — see the layout's own
comments) or hide the inbox to focus on the conversation.

Both the agent-drafted flow and the manual-compose flow are verified end-to-end in a
real browser: chat → `get_emails`/`search_knowledge_base`/`manage_emails` →
`compose_reply` → `EmailReplyCard` → approve → inbox row shows "Replied"; and,
separately, select email → "Compose reply" → fill → Send → reply thread renders →
inbox row shows "Replied" — both with zero console errors.

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

## Resolved: dev agent server used to crash on every run

`agent/node_modules` previously had a broken/conflicting dependency resolution —
`@langchain/langgraph-checkpoint` resolved to `0.0.0` in one place (required
`~0.0.16 || ^0.1.0 || ~1.0.0`), which crashed `POST /threads/{id}/runs/stream` (the
endpoint the CopilotKit frontend uses for every chat turn) inside
`preprocessDebugCheckpoint` (`@langchain/langgraph-api`'s `stream.mjs`) on the first
debug event of any run — so the browser never received a state update and every chat
message effectively no-op'd from the UI's perspective, even though the graph itself
executed and mutated state correctly underneath.

Fixed with a clean reinstall: `rm -rf agent/node_modules agent/package-lock.json &&
npm install` (from `agent/`). `npm ls` now shows a single deduped
`@langchain/langgraph-checkpoint@1.1.3` matching the declared
`@langchain/langgraph-cli@1.4.3`, the "dependencies are not up to date" boot warning is
gone, and a real chat round-trip (classify → draft → approve) completes and streams
state updates to the browser as expected. If this regresses again, re-run the same
clean reinstall in `agent/` — the repo's mix of `package-lock.json` and
`pnpm-lock.yaml` at the root makes it easy for `agent/node_modules` to drift into a bad
state if it's ever installed via pnpm instead of the `npm install` its own scripts use.
