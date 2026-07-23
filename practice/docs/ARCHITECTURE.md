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
│   │   ├── memory/                   # Short-term memory: history trimming/summary + working context
│   │   ├── a2ui.ts                   # A2UI operation helpers
│   │   ├── a2ui_dynamic_schema.ts    # Dynamic-schema A2UI tool (generated dashboards)
│   │   ├── model.ts                  # Shared model instances (tool-calling + plain)
│   │   ├── compose-reply/            # Compose-reply subgraph (reply pipeline) — see below
│   │   │   ├── state.ts              # Subgraph state channels
│   │   │   ├── nodes.ts              # triage / research / draft / approval + reply_to_email tool
│   │   │   └── index.ts              # Assembles + compiles the subgraph
│   │   └── tools/emails/             # Email domain — wired into agent.ts
│   │       ├── schema.ts             # Email / classification / reply zod schemas + CLASSIFICATION_GUIDE
│   │       ├── seed-data.ts          # Generated mock inbox
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

## Graph shape (Phase 2: explicit StateGraph)

`agent/src/agent.ts` is a hand-built `StateGraph`, not `createAgent`:

```
START → prepare_context → manage_memory → recall_memory → call_model → track_context ⇄ tools
                                                              ↑                ↓
                                                              |         compose_reply (subgraph)
                                                              |________________|
                                                                             ↓
                                                                         finalize → END
```

- `prepare_context` — folds `useCopilotReadable` app context into the messages.
- `manage_memory` — summarizes old turns once a thread gets long (short-term memory).
- `recall_memory` — loads the profile of whoever the user's message is about (long-term memory).
- `call_model` — the model call, plus splitting frontend tool calls back out of the response.
- `track_context` — records what the conversation is working on, from the tool calls just made.
- `tools` — LangGraph's prebuilt `ToolNode` over the backend tools.
- `compose_reply` — the compose-reply **subgraph**, entered when the model calls `reply_to_email`
  (see below).
- `finalize` — restores the intercepted frontend tool calls onto the AI message so the browser
  executes them.

The router after `track_context` sends a `reply_to_email` call to the `compose_reply` subgraph,
any other backend tool call to `tools`, and everything else to `finalize`. `reply_to_email` is
never executed as a plain tool — it's purely the signal to enter the subgraph.

### Compose-reply subgraph (`agent/src/compose-reply/`)

Replying used to be the model orchestrating `manage_emails → search_knowledge_base →
compose_reply` as separate tool calls — and it skipped steps (measured: KB search 0/4 on a bare
request, classify 2/5 before a guard). That's now a deterministic subgraph, composed into the
main graph as a single node, following LangGraph's prompt-chaining pattern:

```
triage ──(email found)──▶ research ──▶ write_draft ──▶ request_approval ──▶ (interrupt)
   └────(not found)──────────────────────────────────────────────────────▶ END
```

- `triage` — loads the email and classifies it if unclassified (deterministic — the step the
  model used to skip). Leaves `emailId` empty → END if the id is unknown, answering the tool
  call with an error so the model can recover.
- `research` — always searches the knowledge base for relevant policy.
- `write_draft` — writes the reply (or revises the prior draft for a "make it shorter"), grounded
  in the classification + KB; records it in `workingContext.lastDraft`.
- `request_approval` — raises the CopilotKit approval interrupt (same payload the old
  `compose_reply` tool used, so `EmailReplyCard` is unchanged).

**Why the pipeline ends at the interrupt** rather than applying the send in a later node:
CopilotKit resumes an interrupt by starting a *new* run, not by replaying the graph, so any node
after the interrupt would be dead code. The send is applied by the frontend (`EmailReplyCard` →
`PATCH /api/emails`), as before. Verified against a running server: an unclassified email replied
to via `reply_to_email` comes back classified 3/3, with the approval interrupt raised 3/3 carrying
the `compose_reply` action — the interrupt propagates from inside the subgraph to the top-level
run because a subgraph composed as a node shares the parent's checkpointer.

**Two model instances** (`agent/src/model.ts`): the main `model` binds `parallel_tool_calls:
false` for the ReAct loop; the subgraph's classify/draft calls use `plainModel` (no tool kwargs),
because `withStructuredOutput` sends a `response_format` rather than tools and OpenAI 400s if
`parallel_tool_calls` is set without tools.

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

The graph is wired to CopilotKit with these tools:

- `get_emails` — reads the shared inbox
- `manage_emails` — patches status/classification by id; can't set `replied`/`flagged_for_followup`
- `search_knowledge_base` — keyword search over a mock KB
- `reply_to_email` — signals the model wants to reply; routes into the compose-reply subgraph
  (which classifies, researches, drafts, and raises the approval interrupt — see "Graph shape").
  Never executed as a plain tool.
- `remember_contact` — writes a durable fact/tone to that contact's long-term profile
- `generate_a2ui` — starter's dashboard tool, untouched

`emails` still isn't in the state schema (see "Shared inbox" below), so the graph's state is
just CopilotKit's own `messages` + `copilotkit` fields.

Frontend: `use-email-agent.tsx` + `email-reply-card.tsx` render an editable
Approve/Reject card via `useHumanInTheLoop`. Verified end-to-end in a real browser: draft
→ card renders → approve → backend state confirmed `status: "replied"`.

**HITL interrupt — why raw `interrupt()`, not `copilotKitInterrupt`.** The subgraph's
`request_approval` node (`compose-reply/nodes.ts`) calls LangGraph's `interrupt()` directly
(with CopilotKit's `__copilotkit_interrupt_value__` / `__copilotkit_messages__` payload shape so
the runtime + frontend still recognize the `compose_reply` action — the action name is kept even
though it's no longer a tool, because the frontend card binds to it). We do **not** use `@copilotkit/sdk-js`'s `copilotKitInterrupt`
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

## Short-term memory (`agent/src/memory/`)

Thread-scoped memory, in two parts. The checkpointer already persisted messages per thread for
free; the part that needed building is keeping a long thread affordable to send to the model.

**The problem, measured.** The system prompt (correctly) orders `get_emails` on every question
about inbox state, since the inbox changes outside the chat. Each call appends a full 14-email
JSON dump *with bodies*. On a real 28-message thread that was ~12k tokens, 98% of it tool
results, three separate inbox dumps of which only the newest was still true.

**1. History management (`history.ts`).** Two mechanisms, both applied when *building the
model's input* rather than by mutating `state.messages`:

- **Tombstoning** — every superseded `get_emails` result is replaced with a one-line marker.
  The content is replaced rather than the message dropped: a ToolMessage is the required
  answer to an earlier AI tool call, so removing it would leave a dangling call the provider
  rejects.
- **Summarization** — past `SUMMARIZE_WHEN_OVER` messages, everything except the recent tail is
  folded into a running summary (`historyMemory.summary`, written by `manage_memory` on its own
  model instance) and dropped from the model's input from then on. The cut always lands on a human
  message, since slicing mid-turn would separate a tool call from its answer.

Why not `RemoveMessage`, which is LangGraph's usual answer: CopilotKit renders the chat
transcript from the graph's message list, so deleting from state would erase the user's
visible scrollback. Trimming at model-call time (LangGraph's `pre_model_hook` pattern) gets the
token saving with the conversation intact — hence `createCallModel`'s `prepareMessages`.

**2. Working context (`working-context.ts`).** A small structured carry-over — focused
`emailId` + `emailLabel` + `lastDraft` — so "classify it" resolves without re-listing and "make
it shorter" revises the remembered draft instead of rewriting it. On its own this would be
redundant (both facts are in the transcript, and the model resolves them fine from there); it
earns its place *because of* part 1, as the residue that survives once the messages it was
derivable from are summarized away and tombstoned.

It's derived in a node rather than returned by tools as a `Command` — the pattern the rest of
the repo uses — because `compose_reply` pauses on `interrupt()` and CopilotKit answers that
pause with a fresh run instead of replaying the tool, so anything returned after the interrupt
never lands. `track_context` reads the tool calls off the AI message instead, recording the
draft *before* the approval pause. That's also why it sits between `call_model` and `tools`.

Both memory fields reach the model as system-prompt blocks rebuilt per model call
(`renderHistorySummary` / `renderWorkingContext`), which is why `createCallModel` takes a
function for `systemPrompt`. Both are wrapped in CopilotKit's `zodState` so they survive into
the graph's output schema and are visible to the frontend.

**Verified** against the running server, over a six-turn thread that asks about inbox state
every turn:

| Turn | Messages | Stored history | Sent to model |
| --- | --- | --- | --- |
| 1 | 4 | ~3.9k tok | 5.1k tok |
| 3 | 12 | ~11.9k tok | 5.4k tok |
| 6 | 24 | ~23.7k tok | 5.6k tok |

Stored history grows linearly; what the model receives stays flat, and all 24 messages remain
in state for the UI. Summarization triggered on turn 6 (`summarizedCount: 8`) and the summary
correctly captured which emails were discussed and what was done. Separately: marking one
email read set the focus, "Draft a reply to it." resolved the pronoun and recorded `lastDraft`
*while the run was paused at the approval interrupt*, and "Three sentences, no apology"
returned the same draft with the apology removed rather than a fresh one.

## Long-term memory: contact profiles (`agent/src/memory/contact-profile.ts`)

Short-term memory dies with the thread, so anything learned while replying to a student is
gone when the next conversation opens. A profile keyed by the contact's **email address**
outlives both the thread and the individual email — that's the axis long-term memory adds.

"Contact", not "student", because the sender often isn't the student: a parent writes about
their child, so a profile keyed off the parent's address is about the parent, with the child
as a remembered fact.

- **Storage** — LangGraph's cross-thread `Store`, namespace `["contact_profiles"]`, one item
  per contact: `{ email, name, tone?, facts[], updatedAt }`. Facts are capped at 8 and
  FIFO-trimmed: a profile is injected into every model call for that contact, so an unbounded
  list would quietly undo the context savings from history.ts.
- **Writing** — the `remember_contact` tool, called explicitly by the model. Deliberately not
  an automatic post-reply writer: only the model can tell a durable fact ("Grade 12, Period 3",
  "gets extended time on assessments") from a passing detail of one message, and the tool call
  stays visible in the transcript.
- **Reading** — automatic, never a tool. `recall_memory` runs before the model each turn and
  loads the profile for whoever the user's message names; `track_context` refreshes it when
  focus moves or a new fact is written. It lands in `workingContext.contact` (a cache of the
  Store, not the source of truth) and renders into the system prompt.

**Two bugs this shook out, both worth keeping in mind:**

1. **Never let the model mint the identity key.** The first version took the contact's address
   as a tool argument. The model confidently invented `lilla.douglas-fisher@example.com` for a
   sender whose real address is `lilla_douglas-fisher@hotmail.com` — the write succeeded, and
   since recall looks profiles up by the *real* sender address, that memory was unreachable
   forever. `remember_contact` now takes an **email id** and resolves the address from the
   inbox, matching how every other tool here addresses things.
2. **Recall has to happen before the model call that needs it.** Originally focus (and so
   recall) was established only by `track_context`, from the model's tool calls — but for a
   drafting request, the call that names the email is the same one that writes the draft, so
   the profile arrived one model call too late. Hence `recall_memory`: a deterministic
   sender-name match against the user's message, no LLM call, running before the model.

**Verified** across two threads sharing no messages. Thread A: "her duplicate charge was
refunded yesterday, she's on the Team plan, she asked for short replies with no apologies" →
stored under the correct `lilla_douglas-fisher@hotmail.com`. Thread B (fresh): "Draft a reply
to Lilla Douglas-Fisher about her duplicate charge" →

> We refunded the duplicate renewal charge on 2026-07-20. Your Team plan is still active with
> one subscription only […] refund will post back to your original payment method in 5–7
> business days.

against the same request *before* memory existed, which produced a long apologetic draft saying
the charge "should be refunded". A customer with no stored profile (Florian Klein) drafts
exactly as before, with `workingContext.customer` undefined — no leakage.

## Persistence: Postgres for application data, LangGraph for graph state

The app's own data — the inbox and contact profiles — lives in **Postgres**
(`agent/src/db/index.ts`). Graph **checkpoints** still live in LangGraph's own storage. That
split isn't a preference; it's forced:

`@langchain/langgraph-api` (what `langgraph dev` runs) reassigns persistence on every request:

```js
// node_modules/@langchain/langgraph-api/dist/graph/load.mjs — getGraph()
compiled.checkpointer = checkpointer;      // its own JSON-file storage
compiled.store = options?.store ?? store;
```

So a `PostgresSaver`/`PostgresStore` passed to `.compile()` — the approach in
[LangGraph's add-memory docs](https://docs.langchain.com/oss/javascript/langgraph/add-memory) —
is silently discarded here. That page describes a self-hosted graph; this project runs behind
the platform dev server, which has no Postgres support at all (no `postgres` reference anywhere
in its dist, no database flags on `langgraphjs dev`). Moving checkpoints to Postgres would mean
dropping `langgraph dev` and rebuilding the CopilotKit integration (streaming, interrupts,
threads) by hand. Application data has no such constraint: it's ours, so it goes straight to
Postgres. Deploying to LangGraph Platform puts checkpoints in Postgres anyway, with no code
change.

**Schema** — two tables, created idempotently on first query (`ensureSchema`, memoized so
concurrent callers share one round trip). No migration step: two tables, and a
missing-table error on first run is a worse experience than `CREATE TABLE IF NOT EXISTS`.

- `emails` — the four classification fields are **columns**, not one `jsonb` blob, so counting
  and grouping ("how many Grade 12 are urgent") is a SQL question rather than something the
  model has to derive. A `classification_all_or_nothing` CHECK enforces that all four are
  written together, mirroring the zod schema's invariant in the database itself.
- `contact_profiles` — keyed by the contact's email address, `facts` as `jsonb`.

**Both processes talk to the same database.** The agent reaches it through
`tools/emails/store.ts`; the Next side through `src/lib/db.ts` (duplicated deliberately —
separate TS projects, same reason `src/types/email.ts` duplicates the agent's schema). The
frontend used to reach the inbox through the LangGraph store's REST API, so listing emails
required the agent server to be up. It no longer does.

**TLS** — `sslmode`/`channel_binding` are stripped from the URL and TLS is decided from an
explicit `ssl` option, because node-postgres warns it currently treats `sslmode=require` as
`verify-full` and will adopt libpq's weaker semantics in its next major. Pinning it here means
the same URL can't silently change behaviour on a dependency bump.

## Shared inbox: history — LangGraph cross-thread Store, not per-thread state

> Superseded by the Postgres section above — the inbox now lives in Postgres, and the tools
> no longer take a store at all. Kept because the *problem* it solves still shapes the design:
> the inbox must be common to every thread, which is why it was never graph state.

The inbox used to live in per-thread `agent.state.emails`, so once the threads drawer
shipped, each thread forked its own copy instead of sharing one mailbox. The first fix moved
it to LangGraph's cross-thread `Store` (namespace `["emails"]`, one item per email keyed by
id), which every thread reads/writes the same copy of:

- `get_emails`/`manage_emails`/`compose_reply` (`tools.ts`) used `runtime.store` instead of
  `runtime.state.emails`; `emails` is gone from `AgentStateSchema` in `agent.ts`. No other
  wiring was needed — `langgraph dev`/the deployed API server attaches a store to every
  compiled graph automatically.
- The frontend can't reach that store directly (separate process), so
  `src/app/api/emails/route.ts` talked to the same store over the LangGraph deployment's
  REST API via `@langchain/langgraph-sdk`'s `Client.store`.
- `src/hooks/use-shared-inbox.tsx` (`SharedInboxProvider`/`useSharedInbox`) replaces
  `useAgent().state.emails`/`setState` on the frontend, refetching on mount and whenever a
  chat run finalizes. Mounted once in `page.tsx` around both the chat and the inbox panel.
  It starts **empty** and exposes `isLoading` so the list renders a skeleton for the first
  fetch. It used to seed its first paint from `src/data/seed-emails.ts`, which meant the list
  painted untriaged emails and then visibly rewrote itself once the fetch landed — a database
  seed can't reflect triage done since, so the two stages always drifted apart the moment
  anything was classified. That file is now server-side only (seeding an empty database).

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

## Domain: a high school math teacher's inbox

The app was originally themed as a SaaS support inbox; it now models the inbox of a high
school mathematics teacher who teaches Grade 11 (algebra 2 / precalculus) and Grade 12
(calculus). Only the *data and copy* changed — the store, interrupt/approval flow, tools,
and generative UI are theme-neutral and were untouched by the re-theme.

Classification went from one axis to three, because a teacher triages along all of them
(`agent/src/tools/emails/schema.ts`):

| Field | Values | Role |
| --- | --- | --- |
| `topic` | `question`, `submission`, `review_request`, `grade_dispute`, `absence`, `scheduling`, `admin`, `complex` | why they wrote — drives the reply |
| `course` | `math_11`, `math_12`, `none` | which class — drives filtering/grouping |
| `workType` | `practice`, `exercise`, `homework`, `quiz`, `test`, `project`, `none` | which artifact |
| `urgency` | `low`, `medium`, `high` | how fast, per the rules in the system prompt |

All four are required together — `manage_emails` takes the classification as a unit, since
a partial one renders as a half-filled badge row. `course`/`workType` carry an explicit
`none` member rather than being optional, because plenty of mail (an absence note, a
staff request) legitimately concerns no class or no assignment; the UI suppresses those
badges instead of drawing an empty one. `complex` is kept deliberately as an escape hatch
for genuinely multi-topic mail — without it, classification is trivially easy and the
triage step stops being interesting to watch.

The terminal status `bug_filed` became `flagged_for_followup`; it keeps the same structural
role (reachable only after human approval, never from `manage_emails`).

The knowledge base (`knowledge-base.ts`) holds two kinds of article on purpose: school
*policy* (late work, re-grades, absences/makeups, grade weighting, calculator rules — what
the teacher is actually allowed to promise) and *curriculum* notes per Grade 11/12 unit
(the common student errors), so a reply to a stuck student can be specific rather than
generic. The system prompt forbids inventing deadlines, penalties, or re-grade outcomes.

## Mock inbox data

`agent/src/tools/emails/seed-data.ts` is 17 emails to the teacher covering every topic,
both courses, and mixed urgency, from three sender voices (students, parents, colleagues).
It's generated, not hand-written: `agent/scripts/generate-seed-emails.ts` builds a
structured "brief" per email with faker (sender, child name for parents, class period,
unit, date — fixed seed, so structure is reproducible), then has an LLM write the actual
subject/body prose so the language is varied instead of templated. Units are drawn from a
course-specific list, so a Grade 12 email never cites a Grade 11 topic — the classifier
should be able to infer `course` from the mathematics itself, not just from an explicit
grade mention. Output is validated against the `Email` zod schema before it's written, so a
bad generation fails loudly rather than shipping broken fixtures.

Regenerate with (from `agent/`):

```bash
npm run generate:seed
```

This overwrites `seed-data.ts` — hand edits made after generating will be lost on a rerun.
The frontend's `src/data/seed-emails.ts` is a manual mirror of the same array (separate TS
projects, no shared import boundary) and must be updated alongside it.

**Changing any classification enum requires resetting the store.** `loadEmails` runs
`EmailSchema.parse` over every stored item, so rows written under an older enum throw and
break the whole inbox read. Stop the dev servers and delete
`agent/.langgraph_api/.langgraphjs_api.store.json`; it re-seeds on the next read.

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
