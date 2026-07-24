# AI Email Assistant — practice project

CopilotKit + LangGraph.js inbox-triage assistant for a high-school math teacher, built as
training in two phases (Phase 1: single-agent on the boilerplate. Phase 2: `StateGraph`,
memory, guardrails, multi-agent). Scope and progress live in [docs/ROADMAP.md](./docs/ROADMAP.md).

## Commands

- `npm run dev` — UI on :3000 + agent on :8123 together. `dev:ui` / `dev:agent` to isolate one.
- `npm run typecheck` (Next app) and `npm run typecheck --prefix agent` — both must be clean
  before a task is done. **The root check has 4 pre-existing errors** in untouched boilerplate
  demo files (`src/app/declarative-generative-ui/renderers.tsx`,
  `src/components/generative-ui/charts/bar-chart.tsx`). That is the baseline: don't add to it,
  and don't fix them as a side quest.
- The agent runs under `langgraphjs dev`; the graph entry is `agent/src/agent.ts:graph`,
  registered in `agent/langgraph.json`. Both servers read the root `.env`.

## Where things live

- `agent/src/agent.ts` — graph entry point.
- `agent/src/tools/emails/tools.ts` — the reference tool pattern (`tool()` + `Command` /
  `ToolMessage` returns, `zodState` for shared state). Copy this shape for new tools.
- `agent/src/compose-reply/` — the reference subgraph pattern (`state.ts` / `nodes.ts` / `index.ts`).
- `agent/src/memory/` — contact profiles, history, working context.
- `src/app/layout.tsx` and `src/app/api/copilotkit/[[...slug]]/route.ts` — CopilotKit wiring.
- Inbox and contact profiles are in Postgres (`agent/src/db/`); graph checkpoints are in
  LangGraph's own storage. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) explains why that
  split is forced rather than chosen.

## Rules

These are how we work on this project, not style preferences. Follow them on every change.

1. **Reuse the patterns above before inventing new ones.** Don't introduce a second way to do
   something that already has one without saying why.
2. **Comment the why, not the what.** Non-trivial changes get a short comment on the non-obvious
   reason — a constraint, a workaround, why an interrupt is gated the way it is. Comments that
   restate the code go stale and add noise; skip them.
3. **YOU MUST exercise the feature before calling it done.** Not "the code looks right" — run it.
   Say in your response what you verified and what you didn't. See the `verify-feature` skill.
4. **Tear down anything you started.** Agent (:8123), Next dev server (:3000), monitors, probe
   scripts. An orphaned server holds its port and collides with the user's next `npm run dev`.
5. **Never let secrets leak.** `.env` stays untracked; a new env var goes into `.env.example` in
   the same change.
6. **Commit only when asked**, then small and task-scoped: `Day 2: wire email classification into
   shared state`, not one end-of-day dump.
7. **Flag scope deviations when they happen**, not after. If a task is running past its estimate
   or needs something outside the day's plan, say so mid-task.

## Workflows

Invoke these skills instead of improvising the workflow:

- `verify-feature` — bringing the stack up, exercising a change end-to-end, tearing it down.
- `finish-task` — the docs/estimation updates and done-checklist when wrapping up a task or day.
- `agent-prompt-authoring` — where a given instruction belongs (tool description vs. system
  prompt vs. `respond()` payload). Read it before editing any prompt or tool description.
