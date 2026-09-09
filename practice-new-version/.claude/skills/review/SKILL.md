---
name: review
description: Wrap up a task — update docs, tear down what you started, and walk the done checklist. Use when a feature is built or fixed and about to be called complete, or at a day boundary.
---

# Review before calling it done

**Use this when:** a feature is built (via [`implement`](../implement/SKILL.md)) or fixed
(via [`fix`](../fix/SKILL.md)) and about to be called done, or at a day boundary.

## 📚 Which docs to touch

Only "big" changes need a docs entry. Big = a new tool, a new graph node or edge, a shipped
feature, or a phase boundary. A small internal refactor needs none.

| Change | Doc |
| --- | --- |
| A new manual flow worth re-running later | [docs/TEST-SCENARIOS.md](../../../docs/TEST-SCENARIOS.md) |

`README.md` stays a stable quickstart. Never append progress notes to it.

## 🧹 Tear down — always

Kill background shells you started, then confirm the ports are actually free:

```powershell
Get-NetTCPConnection -LocalPort 8123,3000 -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalPort, OwningProcess
# If anything is still listening:  Stop-Process -Id <pid> -Force
```

Delete any temp probe scripts you wrote. An orphaned server holds its port and breaks the
user's next `pnpm dev` in a way that looks unrelated to your change.

## ✅ Done checklist

### 🔍 Research & structure

- [ ] Searched for an existing component/hook/util before writing a new one — see
      [`shared`](../shared/SKILL.md)'s reuse-first
- [ ] New file in the folder [`implement`](../implement/SKILL.md)'s tables say it belongs in
- [ ] Barrel `index.ts` updated to export it
- [ ] All exports are named — the only default export anywhere in this repo is a
      `*.stories.tsx` meta object, which Storybook requires

### 🔒 Type safety & conventions

- [ ] No `any` / unsafe casts
- [ ] External data (API responses, tool results) validated with zod before use
- [ ] Arrow functions, destructuring, named constants instead of magic numbers — see
      [`shared`](../shared/SKILL.md)

### 🎨 Styling

- [ ] Colors via semantic/`tone-*` tokens — no raw hex, no inline `style={{color:...}}`
- [ ] Icons via `lucide-react` only
- [ ] Conditional classNames via `cn()`, not a template-literal ternary
- [ ] Import order matches [`order-imports`](../order-imports/SKILL.md)

### 🧩 Wiring

- [ ] Follows an existing repo pattern, or the deviation is stated and justified
- [ ] Diff touches a tool/hook/card trio? Run
      [`review-copilotkit-layers`](../review-copilotkit-layers/SKILL.md) — it catches
      failures that don't show up in typecheck or lint
- [ ] Feature exercised end-to-end via [`verify`](../verify/SKILL.md) — not just typechecked
- [ ] `pnpm typecheck` clean across both packages (baseline: the 3 pre-existing
      `apps/web` renderers.tsx errors, no new ones)
- [ ] Non-obvious logic has a why-comment
- [ ] TEST-SCENARIOS updated if a new manual flow is worth re-running later
- [ ] The owning app's `.env.example` (`apps/agent/` or `apps/web/`) in sync if env vars
      changed; no secrets staged
- [ ] Background servers stopped, temp scripts deleted (see teardown above)

### 🐛 If this was a fix

- [ ] Root cause identified and stated — not just the symptom patched
- [ ] No unrelated code changed
- [ ] Other issues noticed along the way reported separately, not fixed silently
- [ ] If it couldn't be fixed confidently: stated clearly, with what's known/unknown and a
      concrete next step — see [`fix`](../fix/SKILL.md)
