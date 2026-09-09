---
name: fix
description: Workflow for fixing a bug in this repo — reproduce, find the root cause, apply a minimal diff, verify the specific regression is gone. Use when triaging or fixing a reported bug rather than building new functionality.
---

# Fix a bug

**Use this when:** triaging or fixing a reported bug, not building new functionality — see
[`implement`](../implement/SKILL.md) for that.

## 🕸️ Misbehaving agent run?

Tool never called, approval card never appears, state seems lost, or thread history doesn't
persist — that's not a plain code defect, it's this repo's LangGraph/CopilotKit wiring. Use
[`debug-graph`](../debug-graph/SKILL.md) instead of guessing from the symptom; it's built
from tracing the actual (non-textbook) checkpointing and interrupt wiring here.

## 🔎 Reproduce first

Get the failing case running before touching code. Check
[`docs/TEST-SCENARIOS.md`](../../../docs/TEST-SCENARIOS.md) for an existing scenario that
covers it, or write a new one if it's worth re-running later.

## 🧩 Find the root cause

Don't patch the symptom you can see — trace it back to where the wrong state/value/decision
was introduced. A fix that only makes the reproduction case pass without explaining *why* it
was wrong is a guess, not a fix.

## ❌ If you can't fix it confidently

Don't guess, patch blindly, or silently change unrelated code hoping it helps. Say instead:

```
I cannot fix this bug confidently.

What I know: [exact technical description of what's understood]
What I don't know: [what runtime context, logs, or config is missing]
Suggested next step: [specific action — add a log here, share the failing request, etc.]
```

E.g.: "What I know: `get_emails` is in `modelTools` but the model never calls it. What I
don't know: whether it's missing from `executableTools` too, or whether its `description`
just doesn't say when to use it. Suggested next step: check `tools/index.ts` for both array
entries, then read the description against `create-tool`'s guidance."

## 🛠️ When you've fixed it, state

1. **What was wrong** — the specific, technical reason
2. **What the fix does** — why it resolves the root cause, not just the symptom
3. **What was not changed** — confirm no unrelated code was touched

## ✂️ Minimal diff

Follow [`shared`](../shared/SKILL.md)'s conventions, but don't refactor incidentally — a bug
fix doesn't need surrounding cleanup.

## ✅ Verify

Prove the specific regression is gone via [`verify`](../verify/SKILL.md) — not just
`pnpm typecheck`. Say which case you exercised.

## 🏁 Finish

Close out via [`review`](../review/SKILL.md), which covers tearing down anything you started.
