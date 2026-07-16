# AI Email Assistant — Practice Project

CopilotKit + LangChain.js/LangGraph email triage assistant, built in two phases per the
practice plan (Phase 1: reuse boilerplate, single-agent, core features. Phase 2: LangGraph
StateGraph, memory, guardrails, multi-agent).

## Stack & commands

- Next.js (App Router, TypeScript) frontend + LangGraph TypeScript agent, wired through
  `@copilotkit/*` v2.
- `npm run dev` — starts UI + agent together. `npm run dev:agent` / `dev:ui` to isolate one.
- Agent lives in `agent/src/agent.ts` (`createAgent` from `langchain`); frontend CopilotKit
  wiring is in `src/app/layout.tsx` and `src/app/api/copilotkit/[[...slug]]/route.ts`.

## Working agreement

These are process rules for how we collaborate on this project, not code style preferences
— follow them on every change, not just when convenient.

1. **Follow existing patterns before inventing new ones.** This boilerplate already has
   working conventions: `Command`-based tool state updates (see `agent/src/tools/emails/tools.ts`),
   `zodState` for shared state fields, the a2ui catalog for generative UI. Reuse them; don't
   introduce a second way to do the same thing without a reason.
2. **Update the docs on every big change.** "Big" = a new tool, a new agent node/edge, a
   shipped feature, or a phase boundary (e.g. moving from `createAgent` to `StateGraph`).
   Progress/scope go in [docs/ROADMAP.md](./docs/ROADMAP.md), structural changes go in
   [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — keep `README.md` itself a stable
   quickstart, not a running log. Small internal refactors don't need a docs entry.
3. **Comment the *why*, not the *what*.** Every non-trivial change gets a short comment
   explaining the non-obvious reasoning — a constraint, a workaround, why an interrupt is
   gated a certain way. Skip comments that just restate the code; those go stale and add
   noise instead of clarity.
4. **Verify before calling something done.** Actually run the flow (agent + UI) for the
   feature just built — classify an email, trigger the approval interrupt, etc. — rather
   than asserting it works because the code looks right. Note in your response what you
   verified and what you didn't.
5. **Match scope to the day's plan; flag deviations instead of absorbing them silently.**
   If a task is trending over its estimated hours or needs something outside that day's
   scope, say so when it happens, not after the fact. [docs/ESTIMATION.md](./docs/ESTIMATION.md)
   tracks the original per-task hour estimate against actual status — update it whenever a
   task's status changes, so drift is visible instead of discovered later.
6. **Small, descriptive commits tied to the task.** e.g. `Day 2: wire email classification
   into shared state` rather than one giant end-of-day commit. Only commit when asked.
7. **Never let secrets leak.** `.env` stays untracked; if a new env var is introduced,
   add it to `.env.example` in the same change.
8. **Typecheck/lint clean before a task is considered finished.** Don't leave a task
   "working but red."

## Definition of done (per task/day)

- [ ] Code follows an existing pattern in the repo, or the deviation is justified
- [ ] docs/ROADMAP.md and/or docs/ARCHITECTURE.md updated if the change is "big" per rule 2
- [ ] docs/ESTIMATION.md status updated for the task(s) just finished
- [ ] Non-obvious logic has a why-comment
- [ ] Feature manually exercised end-to-end (not just typechecked)
- [ ] `.env.example` in sync if env vars changed
- [ ] No secrets staged
