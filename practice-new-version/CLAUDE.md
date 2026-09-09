# AI Email Assistant — practice project

CopilotKit + LangGraph.js inbox-triage assistant for a high-school math teacher. This is a
fresh restart of the `practice/` project: the UI, test scenarios, and configuration were
carried over; **the agent is being rebuilt from scratch** (the old `agent/src` code is not a
reference — don't copy patterns from `practice/`'s agent without deciding they're right).

## Commands

- `pnpm dev` — UI on :3000 + agent on :8123 together. `dev:ui` / `dev:agent` to isolate one.
- `pnpm storybook` — Storybook on :6006 (`build-storybook` for the static build). Every
  component has a `*.stories.tsx` beside its `index.tsx`; shared fixtures/decorators live in
  `apps/web/src/stories`, config in `apps/web/.storybook`. See the web README's Storybook section.
- `pnpm typecheck` — runs `turbo run typecheck` across both packages; must be clean
  before a task is done.
- `pnpm test` — Vitest across both apps (`test:watch` inside one). Tests live in `__test__/`
  subfolders; see the `shared` skill.
- `pnpm lint` / `pnpm format` — ESLint (flat config, `eslint.config.mjs`) and Prettier, scoped to
  this project. A pre-push hook re-runs both on the files in the commits being pushed, plus
  `pnpm test` once for the whole push.
- The agent runs under `langgraphjs dev`; the graph entry and the custom HTTP app (CopilotKit +
  the `/api/emails`/`/api/threads`/`/api/knowledge` routes) are both registered in
  `apps/agent/langgraph.json`.
  **Only the agent has a `.env`, no root one:** it reads `apps/agent/.env` (`langgraph.json`'s
  `"env": ".env"`). The UI reads no env vars at all — `vercel.json`'s `AGENT_URL` rewrite is set
  directly on the Vercel project (dashboard/`vercel env add`), not from any file in the repo.

## Where things live

Turborepo + pnpm workspace: `apps/web` (Vite SPA), `apps/agent`, and `packages/constants` +
`packages/types`. `turbo.json` drives `dev`/`typecheck`/`build` across the packages.

`packages/constants` (`@repo/constants`) and `packages/types` (`@repo/types`) hold the contracts
both sides must agree on — the tool names (`TOOL`), `COMPOSE_REPLY_ACTION`, `CUSTOM_CATALOG_ID`,
the `ChatThread` type, and the BYOK/chat-model headers (`OPENAI_API_KEY_HEADER`,
`CHAT_MODEL_HEADER`, `CHAT_MODEL_OPTIONS`) the web app forwards and the agent's `config/model.ts`
reads per request. Both ship TS source (no build step; `exports` points at `src/index.ts`), so
tsx and Vite compile them in place. Use sites import directly from `@repo/constants` /
`@repo/types` — apps' own `constants/index.ts` / `types/index.ts` barrels hold only what that
app alone cares about (prompts, labels, error wording), not re-exports of the shared packages.

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

Frontend (`apps/web/`, Vite SPA, single page):

- `index.html` + `src/main.tsx` — entry point; `src/app/App.tsx` sets up `QueryClientProvider`
  and renders `src/router/index.tsx`'s router — a single `"/"` route (kept for URL-backed state,
  not multi-page nav) whose element is `src/app/Root.tsx`, wrapping the rest of the providers
  (CopilotKit, theme, OpenAI-key gate) around the page below.
- `src/pages/` — one folder per page, each with an `index.tsx` (`Inbox/` is the only one today,
  since this is a single-page SPA); `src/pages/index.ts` re-exports all. A page's own private
  pieces get their own folder beside its `index.tsx` (`Inbox/AgentSync/`), not `src/components/`.
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

## Workflows

Rules live in these skills now, not here — invoke the one matching what you're doing instead
of improvising:

| Skill | Use when |
| --- | --- |
| `shared` | Always — naming, comments, secrets, style, zod, barrels, formatting, test placement. The other four all assume you've read it |
| `implement` | Building something new — a component, hook, page, tool, or graph node |
| `fix` | Triaging or fixing a reported bug |
| `verify` | Proving an agent/tool/node/UI change actually works, before calling it done |
| `review` | Wrapping up — docs, teardown, the done checklist |
| `agent-prompt-authoring` | Editing any prompt text or tool description — decides whether it belongs in the tool description, system prompt, or a `respond()` payload |
| `add-agent-tool` | Wiring a brand-new tool end to end — LangGraph tool → CopilotKit render → generative UI card |
| `create-tool` | A backend-only tool, or an additional tool with no dedicated card |
| `debug-graph` | A LangGraph run misbehaves — tool never called, approval never fires, state/persistence looks wrong |
| `order-imports` | Writing or editing import statements in `apps/web` |
| `review-copilotkit-layers` | Reviewing a tool + `useRenderTool` hook + card trio before calling it done |
