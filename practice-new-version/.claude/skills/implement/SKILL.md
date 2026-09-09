---
name: implement
description: Checklist of what to touch when adding something new — a component, hook, page, tool, or graph node — split by web vs agent stack. Use when building new functionality, not fixing a bug or reviewing a finished change.
---

# Implement something new

**Use this when:** building a new feature, component, hook, page, tool, or graph node.

📖 Read [`shared`](../shared/SKILL.md) first — naming, comments, secrets, zod, barrels,
formatting, and test placement all apply here too and aren't repeated below.

## 🖥️ Web (`apps/web`)

| Adding | Touch |
| --- | --- |
| A component | `src/components/<Name>/index.tsx` + `<Name>.stories.tsx` beside it, re-exported from `src/components/index.ts` |
| A page-private piece | Its own folder beside the page's `index.tsx` (e.g. `Inbox/AgentSync/`) — not `src/components/` |
| An API resource | One module in `src/api/` using `apiFetch` from `src/api/client.ts` — hooks never call `fetch` directly |
| Server state | A `useX` query hook + a mutation hook per write in `src/hooks/`; wire `useSync*` to invalidate on `onRunFinalized` |
| Client-only state | A zustand store in `src/stores/` (theme, OpenAI key, compose approval are the existing examples) |
| A rendered card for an agent tool's result | Not a plain component — it's a 3-file trio (tool → hook → card). Use [`add-agent-tool`](../add-agent-tool/SKILL.md) for the full checklist and [`review-copilotkit-layers`](../review-copilotkit-layers/SKILL.md) before calling it done |

### Splitting a component

No enforced limit, but as a rule of thumb: extract a sub-component once a JSX block repeats
or has a clearly distinct responsibility, extract a custom hook once a component collects
more than 2-3 `useState`/`useEffect`, and split props or extract a section once a props
interface or file gets hard to scan at a glance. This is a recommendation, not a lint rule.

### Loading / error / empty — two different patterns, don't mix them

| Data source | Pattern | Reference |
| --- | --- | --- |
| TanStack Query hook (`useSharedInbox`-style) | `isLoading` / `error` / `!data?.length` branches | `src/hooks/useSharedInbox.ts` |
| An agent tool's result inside a card | `parseToolResult(result)`'s 3 states: `null` (pending) / `{ok:false,error}` (failure) / `{ok:true,data}` — then still handle `data`'s own empty case (`GetEmailsCard`'s `count === 0`) | [`review-copilotkit-layers`](../review-copilotkit-layers/SKILL.md) |

A tool card that only branches on `envelope?.data` and skips the `!envelope.ok` case is the
single most common way this silently ships broken.

### Tool → hook → card, at a glance

| Layer | Responsibility | Loading | Error |
| --- | --- | --- | --- |
| Tool (`tools/*.ts`) | fetch/compute, validate | — | `defineTool` catches it, wraps as `{ok:false,error}` |
| Hook (`useToolRenderers.tsx`) | map `status`/`result` → props | passes through to card | passes through to card |
| Card (`toolCards/<Name>/index.tsx`) | render | `<Pending />` | `<ToolFailure error={...} />` |

Full checklist for wiring this trio: [`add-agent-tool`](../add-agent-tool/SKILL.md). Review
pass once it exists: [`review-copilotkit-layers`](../review-copilotkit-layers/SKILL.md).

## ⚙️ Agent (`apps/agent`)

| Adding | Touch |
| --- | --- |
| A tool (backend-only, no card) | [`create-tool`](../create-tool/SKILL.md) |
| A tool with a rendered card | [`add-agent-tool`](../add-agent-tool/SKILL.md) — spans both apps |
| A graph node | `src/nodes/`, wire it into `src/graphs/index.ts` or the relevant subgraph |
| A prompt | `src/prompts/` — see [`agent-prompt-authoring`](../agent-prompt-authoring/SKILL.md) for whether it belongs in the tool description, system prompt, or a `respond()` payload |
| A state shape change | `src/state/` StateSchema |
| A new type/schema | `src/types/`, zod-first per `shared` |

## Then

Prove it works via [`verify`](../verify/SKILL.md) and close out via [`review`](../review/SKILL.md).
