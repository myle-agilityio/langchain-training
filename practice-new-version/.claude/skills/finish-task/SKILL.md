---
name: finish-task
description: Wrap up a task — update docs and walk the done checklist. Use when a feature is built and about to be called complete, or at a day boundary.
---

# Finish a task

## Which docs to touch

Only "big" changes need a docs entry. Big = a new tool, a new graph node or edge, a shipped
feature, or a phase boundary. A small internal refactor needs none.

| Change | Doc |
| --- | --- |
| A new manual flow worth re-running later | [docs/TEST-SCENARIOS.md](../../../docs/TEST-SCENARIOS.md) |

`README.md` stays a stable quickstart. Never append progress notes to it.

## Done checklist

- [ ] Follows an existing repo pattern, or the deviation is stated and justified
- [ ] Feature exercised end-to-end via the `verify-feature` skill — not just typechecked
- [ ] `pnpm typecheck` clean across both packages (baseline: the 3 pre-existing
      `apps/web` renderers.tsx errors, no new ones)
- [ ] Non-obvious logic has a why-comment
- [ ] TEST-SCENARIOS updated if a new manual flow is worth re-running later
- [ ] `.env.example` in sync if env vars changed; no secrets staged
- [ ] Background servers stopped, temp scripts deleted
