# AI Email Assistant — practice project (restart)

CopilotKit + LangGraph.js inbox-triage assistant for a high-school math teacher. This is a
fresh restart of the `practice/` project: the UI, test scenarios, and configuration were
carried over; **the agent is being rebuilt from scratch** (the old `agent/src` code is not a
reference — don't copy patterns from `practice/`'s agent without deciding they're right).

## Commands

- `pnpm dev` — UI on :3000 + agent on :8123 together. `dev:ui` / `dev:agent` to isolate one.
- `pnpm typecheck` — runs `turbo run typecheck` across both packages; must be clean
  before a task is done.
- `pnpm lint` / `pnpm format` — ESLint (flat config, `eslint.config.mjs`) and Prettier, scoped to
  this project. A pre-push hook re-runs both, but only on the files in the commits being pushed.
- The agent runs under `langgraphjs dev`; the graph entry and the custom HTTP app (CopilotKit +
  the `/api/emails`/`/api/threads`/`/api/knowledge` routes) are both registered in
  `apps/agent/langgraph.json`.
  **Only the agent has a `.env`, no root one:** it reads `apps/agent/.env` (`langgraph.json`'s
  `"env": ".env"`). The UI reads no env vars at all — `vercel.json`'s `AGENT_URL` rewrite is set
  directly on the Vercel project (dashboard/`vercel env add`), not from any file in the repo.

## Where things live

Turborepo + pnpm workspace: `apps/web` (Vite SPA), `apps/agent`, and `packages/shared`.
`turbo.json` drives `dev`/`typecheck`/`build` across the packages.

`packages/shared` (`@repo/shared`) holds the contracts both sides must agree on — the tool
names (`TOOL`), `COMPOSE_REPLY_ACTION`, `CUSTOM_CATALOG_ID`, the `ChatThread` type, and the BYOK/
chat-model headers (`OPENAI_API_KEY_HEADER`, `CHAT_MODEL_HEADER`, `CHAT_MODEL_OPTIONS`) the web
app forwards and the agent's `config/model.ts` reads per request. It ships
TS source (no build step; `exports` points at `src/index.ts`), so tsx and Vite compile it in
place. Each app re-exports what it needs through its own `constants/index.ts` / `types/index.ts`
barrel — use sites keep importing from `@/constants` and `@/types`, never from `@repo/shared`
directly. Anything one side alone cares about (prompts, labels, error wording) stays in that app.

Agent (`apps/agent/src/`), organized by role:

- `graphs/` — graph definitions; `graphs/index.ts:graph` is the entry registered in
  `apps/agent/langgraph.json`, `graphs/composeEmailSubgraph.ts` the compose pipeline.
- `nodes/` — node implementations; `prompts/` — every prompt string; `tools/` — tool
  definitions; `state/` — StateSchema definitions; `types/` — zod schemas + interfaces.
- `db/` — Postgres pool + queries, `PostgresSaver` checkpointer, `PostgresStore` memory store;
  `db/inbox.ts` and `db/threads.ts` back the HTTP routes below.
- `rag/` — pgvector knowledge base (`ensureIndexed` seeds `kb_documents` on first boot,
  `searchKnowledge` is the semantic search everything uses).
- `config/` — env validation + model instances; `constants/` — tool names; `utils/` — helpers.
- `http/` — the custom Hono app mounted onto `langgraphjs dev` via `langgraph.json`'s
  `http.app`: `copilotkit.ts` (the CopilotKit endpoint), `emails.ts`/`threads.ts` (the inbox's
  REST routes) and `knowledge.ts` (KB semantic search, no LLM turn) — all proxied to from Vite
  in dev via `vite.config.ts`'s `server.proxy`.

Frontend (`apps/web/`, Vite SPA, single page — no router):

- `index.html` + `src/main.tsx` — entry point; `src/app/App.tsx` — providers (TanStack Query,
  CopilotKit, theme, OpenAI-key gate) wrapping the inbox + chat layout.
- `src/components/` — one folder per component, each with an `index.tsx`; a folder whose
  `index` is a barrel groups them (`common/` primitives, `generativeUI/`,
  `declarativeGenerativeUI/` — the A2UI catalog). `src/components/index.ts` re-exports all.
- `src/components/EmailInbox/` — the inbox UI; `src/hooks/useSharedInbox.ts` is its data
  provider (reads `/api/emails`, proxied to the agent's HTTP app above).
- `src/api/` is the only place that talks HTTP: `client.ts`'s `apiFetch` (JSON in/out, uniform
  `METHOD /path failed (status)` errors) plus one module per resource. Hooks never call `fetch`.
- Server state is TanStack Query: `src/lib/queryClient.ts` (one client, one error log point) plus
  the `useSharedInbox`/`useSelfManagedThreads` hooks — a `useX` query hook per resource and a
  mutation hook per write, with the `useSync*` hooks invalidating on `onRunFinalized`.
  `src/stores/` stays zustand, for client-only state (theme, OpenAI key, compose approval).
- `src/lib/` is configured third-party instances only (`queryClient.ts`); `src/utils/` is pure
  helpers and `src/constants/` is values — both one file per concept behind an `index.ts`
  barrel, and neither holds React hooks (those go in `src/hooks/`).

Everything persistent is in the one Postgres behind `DATABASE_URL`: the inbox (`emails`), the
embedded KB (`kb_documents`), graph checkpoints (`checkpoints*`), and the cross-thread store
(`store*` — contact profiles live here as a namespaced key, not their own table).

## Rules

These are how we work on this project, not style preferences. Follow them on every change.

1. **Reuse the patterns above before inventing new ones.** Don't introduce a second way to do
   something that already has one without saying why.
2. **Keep comments to max 2 short line.** No multi-line or paragraph comments explaining rationale —
   If it needs more than a line to explain, say it in the PR/response instead.
3. **YOU MUST exercise the feature before calling it done.** Not "the code looks right" — run it.
   Say in your response what you verified and what you didn't. See the `verify-feature` skill.
4. **Tear down anything you started.** Agent (:8123), Vite dev server (:3000), monitors, probe
   scripts. An orphaned server holds its port and collides with the user's next `pnpm dev`.
5. **Never let secrets leak.** `.env` stays untracked; a new agent env var goes into
   `apps/agent/.env.example` in the same change. `apps/web` has no env vars of its own.
6. **Name source files and folders in camelCase** — `useSharedInbox.ts`, `emailFilters.ts`,
   `components/generativeUI/` — except anything whose export is a React component, which is
   PascalCase matching it: a component file (`renderers.tsx`'s siblings), and a component
   folder holding that component's `index.tsx` (`components/InboxList/`,
   `components/common/DropdownMenu/`). Barrel `index.ts`/`index.tsx` files keep their name. **Assets and scripts stay kebab-case**:
   `public/copilotkit-logo-mark.svg` and the KB documents in `rag/sample-docs/`
   (`loaders.ts` derives each title from its filename).
7. **Barrels re-export whole modules with `export *`.** When the barrel takes everything a file
   exports, write `export * from "./x"` — `export type * from "./x"` if that file is types only —
   instead of listing every name. Spell out names only when the barrel deliberately takes a
   subset, e.g. each app picking its share of `@repo/shared`.

8. **Blank lines separate sections; every branch gets braces.** A body reads as declarations →
   work → return, split by blank lines: one after each block (`if {}`, `for {}`), one before a
   `return`/`throw`, one after a run of declarations. No single-line `if (x) doThing();`.
   `@stylistic/padding-line-between-statements` + `curly` in `eslint.config.mjs` enforce this —
   `pnpm lint:fix` applies it.

## Workflows

Invoke these skills instead of improvising the workflow:

- `verify-feature` — bringing the stack up, exercising a change end-to-end, tearing it down.
- `finish-task` — the docs updates and done-checklist when wrapping up a task or day.
- `agent-prompt-authoring` — where a given instruction belongs (tool description vs. system
  prompt vs. `respond()` payload). Read it before editing any prompt or tool description.
