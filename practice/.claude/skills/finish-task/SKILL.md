---
name: finish-task
description: Wrap up a task or a practice-plan day — update ROADMAP/ARCHITECTURE/ESTIMATION and walk the done checklist. Use when a feature is built and about to be called complete, or at a day boundary.
---

# Finish a task

## Which docs to touch

Only "big" changes need a docs entry. Big = a new tool, a new graph node or edge, a shipped
feature, or a phase boundary (e.g. `createAgent` → `StateGraph`). A small internal refactor
needs none.

| Change | Doc |
| --- | --- |
| Progress, scope, what's built vs. planned | [docs/ROADMAP.md](../../../docs/ROADMAP.md) |
| Structure — new node/edge/tool/subgraph, persistence, data flow | [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) |
| A task's status changing (any task, big or small) | [docs/ESTIMATION.md](../../../docs/ESTIMATION.md) |
| A new manual flow worth re-running later | [docs/TEST-SCENARIOS.md](../../../docs/TEST-SCENARIOS.md) |

`README.md` stays a stable quickstart. Never append progress notes to it.

ESTIMATION.md tracks the original per-task hour estimate against actual status, so drift shows
up while it's still actionable. Update it as status changes — not in a batch at the end of the
week, which is exactly when the drift is no longer useful information.

## Done checklist

- [ ] Follows an existing repo pattern, or the deviation is stated and justified
- [ ] Feature exercised end-to-end via the `verify-feature` skill — not just typechecked
- [ ] `npm run typecheck` and `npm run typecheck --prefix agent` clean (root baseline: the
      4 pre-existing boilerplate errors, no new ones)
- [ ] Non-obvious logic has a why-comment
- [ ] ROADMAP / ARCHITECTURE updated if the change was "big"; ESTIMATION status updated
- [ ] `.env.example` in sync if env vars changed; no secrets staged
- [ ] Background servers stopped, temp scripts deleted
- [ ] Any scope overrun was flagged when it happened, not buried in the summary
