# AI Email Assistant — practice project (restart)

CopilotKit + LangGraph.js inbox-triage assistant for a high-school math teacher. This is a
fresh restart of the `practice/` project: the UI, test scenarios, and configuration were
carried over; **the agent is being rebuilt from scratch** (the old `agent/src` code is not a
reference — don't copy patterns from `practice/`'s agent without deciding they're right).

## Commands

- `pnpm dev` — UI on :3000 + agent on :8123 together. `dev:ui` / `dev:agent` to isolate one.
- `pnpm typecheck` — runs `turbo run typecheck` across both packages; must be clean
  before a task is done. **The `web` check has 3 pre-existing errors**, all in
  `apps/web/src/app/declarative-generative-ui/renderers.tsx` (untouched boilerplate). That is the
  baseline: don't add to it, and don't fix them as a side quest.
- The agent runs under `langgraphjs dev`; the graph entry and the custom HTTP app (CopilotKit +
  the `/api/emails`/`/api/threads` routes) are both registered in `apps/agent/langgraph.json`. Both
  servers read the root `.env`.

## Where things live

Turborepo + pnpm workspace: `apps/web` (Vite SPA) and `apps/agent`. `turbo.json` drives
`typecheck`/`build`; `pnpm dev` stays on `scripts/dev.mjs` (turbo's spawning hangs the agent
on Windows — see the comment at the top of that file).

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
  REST routes, proxied to from Vite in dev via `vite.config.ts`'s `server.proxy`).

Frontend (`apps/web/`, Vite SPA, single page — no router):

- `index.html` + `src/main.tsx` — entry point; `src/app/App.tsx` — providers (CopilotKit,
  theme, OpenAI-key gate) wrapping the inbox + chat layout.
- `src/components/email-inbox/` — the inbox UI; `src/hooks/use-shared-inbox.tsx` is its data
  provider (reads `/api/emails`, proxied to the agent's HTTP app above).

Everything persistent is in the one Postgres behind `DATABASE_URL`: the inbox (`emails`,
`contact_profiles`), the embedded KB (`kb_documents`), graph checkpoints (`checkpoints*`) and
the cross-thread store (`store*`).

## Rules

These are how we work on this project, not style preferences. Follow them on every change.

1. **Reuse the patterns above before inventing new ones.** Don't introduce a second way to do
   something that already has one without saying why.
2. **Keep comments to 1 short line.** No multi-line or paragraph comments explaining rationale —
   If it needs more than a line to explain, say it in the PR/response instead.
3. **YOU MUST exercise the feature before calling it done.** Not "the code looks right" — run it.
   Say in your response what you verified and what you didn't. See the `verify-feature` skill.
4. **Tear down anything you started.** Agent (:8123), Vite dev server (:3000), monitors, probe
   scripts. An orphaned server holds its port and collides with the user's next `pnpm dev`.
5. **Never let secrets leak.** `.env` stays untracked; a new env var goes into `.env.example` in
   the same change.

## Workflows

Invoke these skills instead of improvising the workflow:

- `verify-feature` — bringing the stack up, exercising a change end-to-end, tearing it down.
- `finish-task` — the docs updates and done-checklist when wrapping up a task or day.
- `agent-prompt-authoring` — where a given instruction belongs (tool description vs. system
  prompt vs. `respond()` payload). Read it before editing any prompt or tool description.
