---
name: review-copilotkit-layers
description: Use when reviewing, or having just written, a LangGraph tool + useRenderTool hook + generative UI card trio — before treating that tool integration as finished.
---

# Review a tool/hook/card trio

**Use this when:** a diff touches a tool's `defineTool`, its `useRenderTool` registration, or
its card component — general "does it look right" review misses the framework-specific
failure modes below, which don't fail typecheck or lint, only at runtime.

## ✅ Checklist

**Tool — `apps/agent/src/tools/*.ts`**

- [ ] Built with `defineTool` (not hand-rolled `tool()` + manual `JSON.stringify` — that's
      only for the deliberate `reply_to_email` exception, see
      [`create-tool`](../create-tool/SKILL.md))
- [ ] Registered in **both** `modelTools` and `executableTools` in `tools/index.ts` (unless
      it's genuinely routing-only)
- [ ] Uses the `TOOL` constant from `@repo/constants`, not a string literal
- [ ] `description` states when to use it, including relative to any similar tool — the
      system prompt won't repeat this

**Hook — `apps/web/src/hooks/useToolRenderers.tsx`**

- [ ] Registered via `useRenderTool({ name: TOOL.X, parameters, render }, [])`
- [ ] `parameters` schema mirrors the agent's input schema (only reshapes what the renderer
      needs from `props.parameters`)
- [ ] `render` handles every state `parseToolResult` can hand the card — not just the happy
      path (see below)

**Card — `apps/web/src/components/generativeUI/toolCards/<Name>/index.tsx`**

- [ ] Calls `parseToolResult<T>(result)` to unwrap the envelope — never reads `result` raw
- [ ] Handles all three states the envelope can be in: `null` (still pending —
      `<Pending />`), `{ok:false, error}` (`<ToolFailure error={envelope.error} />`), and
      `{ok:true, data}` (the real render)
- [ ] Wrapped in `<Shell icon={...} title="..." status={status} />` — the shared chrome every
      tool card uses (see `GetEmailsCard` as the canonical example)
- [ ] Empty-result case handled explicitly (e.g. `data.count === 0`), not just the
      undefined/pending case
- [ ] Follows the `Shell` family's padding (`px-3 py-2`-ish), not the standalone `Card`'s
      (`p-6`) — see [`shared`](../shared/SKILL.md)'s style section for why these aren't
      unified

## Why these specifically

`defineTool`'s envelope and `parseToolResult`'s three-state contract both fail silently, not
with a type error: a card that only checks `envelope?.data` and skips the `!envelope.ok`
branch will render nothing useful on a tool failure, and TypeScript won't flag it because
`envelope` is still a valid (just wrong-branch) value. The `modelTools`/`executableTools`
split is the other one worth double-checking — a tool present in one but not the other
compiles and looks correct at a glance.

## Related

New tool that doesn't exist yet? Use [`add-agent-tool`](../add-agent-tool/SKILL.md) for the
full file checklist instead of reconstructing it here.
