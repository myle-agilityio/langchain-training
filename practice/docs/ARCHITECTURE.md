# Architecture & Current State

What's actually built, as of **Phase 2 in progress (Day 4: StateGraph migration landed)**. See
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
│   │   ├── agent.ts                  # Graph entry point (StateGraph), state schema, system prompt
│   │   ├── copilotkit-bridge.ts      # Runs CopilotKit's middleware hooks from plain graph nodes
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

## Graph shape (Phase 2: explicit StateGraph)

`agent/src/agent.ts` is a hand-built `StateGraph`, not `createAgent`:

```
START → prepare_context → call_model ⇄ tools
                              ↓
                          finalize → END
```

- `prepare_context` — folds `useCopilotReadable` app context into the messages.
- `call_model` — the model call, plus splitting frontend tool calls back out of the response.
- `tools` — LangGraph's prebuilt `ToolNode` over the five backend tools.
- `finalize` — restores the intercepted frontend tool calls onto the AI message so the browser
  executes them.

It's the same ReAct loop `createAgent` produced, but every step is a node we own — which is
what the rest of Phase 2 needs, since memory, guardrails and agent handoff are all "put
another node in the loop" changes that `createAgent`'s single opaque agent node can't express.

**Why `copilotkit-bridge.ts` exists.** CopilotKit ships its LangGraph integration as a
`createAgent` *middleware*, and a raw `StateGraph` has no middleware runner. Reimplementing
what it does (context injection, merging frontend tools from `state.copilotkit.actions` into
the model call, intercepting frontend tool calls so the browser runs them instead of the
graph) would be a second, drifting copy of CopilotKit's behaviour — so instead the bridge
calls the middleware's own hooks (`beforeAgent`, `wrapModelCall`, `afterModel`, `afterAgent`)
by hand from the nodes above, rebuilding the langchain `Runtime` object from the node's
config the same way `createAgent` does. The loose typing in that file is deliberate: the hook
signatures are generic over `createAgent`'s inferred state, which a hand-built graph can't
reproduce, so the casts are confined there.

`wrapToolCall` is *not* bridged: its only job in this middleware is supplying the
dynamically-injected A2UI tool, and the runtime is configured with `a2ui.injectA2UITool:
false` (`src/app/api/copilotkit/[[...slug]]/route.ts`) — our `generate_a2ui` is a static
backend tool the `ToolNode` already knows about. If that flag is ever flipped on, the tools
node will need the bridge too.

Verified against the running `langgraphjs dev` server after the migration: node path
`prepare_context → call_model → tools → call_model → finalize`; a `compose_reply` run pauses
with the CopilotKit interrupt recorded; a run with a `toggleTheme` frontend action in
`copilotkit.actions` ends with that tool call restored on the final AI message (not executed
in-graph); and `stream_mode: ["messages"]` still emits token chunks, so chat text streams.

## Current demo

The graph is wired to CopilotKit with four email tools plus the starter's dashboard tool:

- `get_emails` — reads the shared inbox
- `manage_emails` — patches status/classification by id; can't set `replied`/`bug_filed`
- `compose_reply` — pauses via LangGraph's raw `interrupt()` for approval; returns the
  decision but doesn't apply it (see below, and the HITL note)
- `search_knowledge_base` — keyword search over a mock KB
- `generate_a2ui` — starter's dashboard tool, untouched

`emails` still isn't in the state schema (see "Shared inbox" below), so the graph's state is
just CopilotKit's own `messages` + `copilotkit` fields.

Frontend: `use-email-agent.tsx` + `email-reply-card.tsx` render an editable
Approve/Reject card via `useHumanInTheLoop`. Verified end-to-end in a real browser: draft
→ card renders → approve → backend state confirmed `status: "replied"`.

**HITL interrupt — why raw `interrupt()`, not `copilotKitInterrupt`.** `compose_reply` calls
LangGraph's `interrupt()` directly (with CopilotKit's `__copilotkit_interrupt_value__` /
`__copilotkit_messages__` payload shape so the runtime + frontend still recognize the
`compose_reply` action). We do **not** use `@copilotkit/sdk-js`'s `copilotKitInterrupt`
helper: on langgraph 1.4.x, `interrupt()` pauses by *throwing* a `GraphInterrupt`, and that
helper wraps the call in a `try/catch` that swallows it and rethrows as
`CopilotKitMisuseError` ("Failed to create interrupt: …"), so the run errors instead of
pausing (langgraph's own `interrupt()` docstring warns: never catch it without rethrowing).
Verified against the running server: with the helper the run errors and records no
interrupt; calling `interrupt()` directly, the run pauses with the interrupt recorded and
the card renders. Triggering the run must also go through the core's interrupt-aware path
(`copilotkit.runAgent({ agent })` / CopilotChat), not a bare `agent.runAgent()`.

`email-inbox/` is the app-mode content (`page.tsx`'s `appContent`, replacing the old todo
canvas): a two-pane list + detail view over the shared inbox (see below). Selecting a row
marks it read; the detail panel's "Compose reply" button opens a manual draft form
(subject/body) that sends by patching `status: "replied"` + `reply` into that same shared
inbox — the same frontend-mutates-shared-state pattern `EmailReplyCard`'s approve handler
uses, just without any agent/interrupt round-trip at all, per the "manual compose"
requirement (user drafts/sends without going through the agent).

The detail panel also has an "Ask AI to draft" button next to "Compose reply": it hands the
selected email to the agent as a normal chat turn (`agent.addMessage` + `agent.runAgent` on
the same agent the chat pane binds to), so the run streams into the visible chat and its
`compose_reply` interrupt renders the editable `EmailReplyCard` there for approval. It's
disabled (showing "Drafting…") while `agent.isRunning`. This is the agent-assisted
counterpart to manual compose — one button routes through the model + approval card, the
other writes straight to the shared inbox.

## Shared inbox: LangGraph cross-thread Store, not per-thread state

The inbox used to live in per-thread `agent.state.emails`, so once the threads drawer
shipped, each thread forked its own copy instead of sharing one mailbox. Fixed by moving it
to LangGraph's cross-thread `Store` (namespace `["emails"]`, one item per email keyed by
id — `agent/src/tools/emails/store.ts`), which every thread reads/writes the same copy of:

- `get_emails`/`manage_emails`/`compose_reply` (`tools.ts`) use `runtime.store` instead of
  `runtime.state.emails`; `emails` is gone from `AgentStateSchema` in `agent.ts`. No other
  wiring needed — `langgraph dev`/the deployed API server attaches a store to every
  compiled graph automatically.
- The frontend can't reach that store directly (separate process), so
  `src/app/api/emails/route.ts` talks to the same store over the LangGraph deployment's
  REST API via `@langchain/langgraph-sdk`'s `Client.store`.
- `src/hooks/use-shared-inbox.tsx` (`SharedInboxProvider`/`useSharedInbox`) replaces
  `useAgent().state.emails`/`setState` on the frontend, refetching on mount and whenever a
  chat run finalizes. Mounted once in `page.tsx` around both the chat and the inbox panel.

`get_emails` also returns `total`/`countsByStatus`, not just the raw array — testing this
fix surfaced the model miscounting entries in the JSON dump when asked "how many unread?"
(a known LLM weak spot, not a data bug); precomputing the breakdown turns that into a
lookup instead of model arithmetic.

Verified: opened the inbox in two different chat threads (via the threads drawer) and
confirmed marking an email read/replied in one is immediately visible after switching to
the other.

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
