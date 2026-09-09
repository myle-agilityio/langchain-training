---
name: shared
description: Cross-cutting coding conventions — naming, comments, secrets, icons/colors, zod, barrels, formatting, test placement — that every other workflow skill (implement, fix, review) inherits. Use before writing or touching any code in this repo.
---

# Shared conventions

**Use this when:** you're about to write, edit, or review any code here — read this first,
regardless of whether you're implementing, fixing, or reviewing. `implement`, `fix`, and
`review` all point here instead of restating these rules.

## 🎭 Role

You're a full-stack engineer working across this repo's actual stack: React 19 on a Vite SPA
(no Next.js, no SSR), TypeScript strict mode, Tailwind v4 (`@theme` tokens, not a config
file), Zod, `lucide-react`, CopilotKit v2 (`useRenderTool`, `useInterrupt`), and LangGraph.js
(`apps/agent/src`: tools, `StateGraph`, Postgres checkpointing). Building the CopilotKit +
LangGraph.js inbox-triage agent for a high-school math teacher — see CLAUDE.md's opening
paragraph for the full framing. It's a from-scratch rebuild; don't copy patterns from the old
`practice/` agent without deciding they're right.

## 🧭 Reuse first

Don't introduce a second way to do something that already has one without saying why. Check
CLAUDE.md's "Where things live" section before adding a new pattern.

## 🏷️ Naming

| Kind | Convention | Example |
| --- | --- | --- |
| Source files/folders (default) | camelCase | `useSharedInbox.ts`, `emailFilters.ts`, `components/generativeUI/` |
| A file whose export is a React component | PascalCase, matching the export | `renderers.tsx`'s siblings |
| A folder holding one component's `index.tsx` | PascalCase | `components/InboxList/`, `components/common/DropdownMenu/` |
| Barrel files | keep the name | `index.ts` / `index.tsx` |
| Assets and scripts | kebab-case | `public/copilotkit-logo-mark.svg`, `rag/sample-docs/*` |

## 💬 Comments

Max 2 short lines. No multi-line or paragraph comments explaining rationale — if it needs
more than that, say it in the PR/response instead.

## 🔐 Secrets

`.env` stays untracked. A new agent env var goes into `apps/agent/.env.example` in the same
change. `apps/web` has no env vars of its own.

## 🎨 Style — icons, color, imports

- Icons come from `lucide-react` (already a dependency) — don't add another icon library or
  hand-roll inline SVGs for something it already covers.
- Colors are the semantic tokens `apps/web/src/app/globals.css` defines under `@theme inline`
  (`--color-primary`, `--color-muted-foreground`, `--color-tone-blue/red/amber/violet`, ...).
  Use their Tailwind classes:

  ```tsx
  // yes
  <Badge className="bg-tone-amber text-tone-amber-foreground" />
  // no — bypasses the theme, breaks in dark mode
  <Badge className="bg-amber-500 text-white" />
  ```

- Spacing has no single unified scale — two padding families coexist by design: the
  `toolCards/common/Shell` family (`px-3 py-2`-ish, used by every generative tool card) and
  the standalone `Card`/`CardContent` family (`p-6`, used outside the chat). Match whichever
  family your component belongs to; don't invent a third.
- Conditional classNames go through `cn()` (`apps/web/src/utils/cn.ts`, `clsx` +
  `tailwind-merge`) — never a template-literal ternary, which doesn't resolve Tailwind class
  conflicts.
- Import order — see the [`order-imports`](../order-imports/SKILL.md) skill.

## ✍️ Coding conventions

Verified against the actual source (zero exceptions found), not aspirational:

- **Arrow functions only** — no `function` declarations anywhere in `apps/web/src` or
  `apps/agent/src`.
- **Named exports only** — `export default` appears nowhere except `*.stories.tsx` files,
  where Storybook itself requires a default-exported meta object. Don't default-export
  anything else.
- **No `any`** — `strict: true` in `packages/typescript-config/base.json`, and zero `any`/
  `as any` in real source. Narrow with a type guard instead (`error instanceof Error`).
- **No magic numbers** — a bare literal like a row cap goes in a named constant beside its
  use (`const MAX_ROWS = 4;` in `GetEmailsCard`), not inline.
- **Destructure** props/state where you read more than one field from it.
- **Avoid inline arrow functions in JSX** for anything reused across renders or passed to a
  memoized child — name the handler instead.

## 🧬 Zod

Schema-first: define the shape with `z.object`/`z.enum`, derive the TS type from it — don't
hand-write a duplicate interface. Enums get their own named schema so they're reusable
elsewhere (e.g. as a filter field). From `apps/agent/src/types/email.ts`:

```ts
export const TopicSchema = z.enum(["question", "submission", "grade_dispute", /* ... */]);

export const ClassificationSchema = z.object({
  topic: TopicSchema,
  course: CourseSchema,
});
export type Classification = z.infer<typeof ClassificationSchema>;
```

## 📦 Barrels

Re-export whole modules with `export *` (or `export type *` for a types-only file) when the
barrel takes everything a file exports. Spell out names only when it deliberately takes a
subset, e.g. `apps/agent/src/errors/index.ts`:

```ts
export { AppError } from "./AppError";
export { ERRORS, GENERIC_MESSAGE, type ErrorSpec } from "./catalog";
```

## ✂️ Formatting

Blank lines separate sections; every branch gets braces. A body reads as
declarations → work → return. From `apps/agent/src/nodes/moderator.ts`:

```ts
const last = state.messages[state.messages.length - 1];

if (!HumanMessage.isInstance(last)) {
  return { blocked: false };
}

const check = await chain.invoke(/* ... */);

if (!check.flagged) {
  return { blocked: false };
}
```

`@stylistic/padding-line-between-statements` + `curly` in `eslint.config.mjs` enforce this —
`pnpm lint:fix` applies it.

## 🧪 Tests

| Code | Home | Why |
| --- | --- | --- |
| Deterministic code | `__test__/` subfolder beside it, e.g. `utils/__test__/emailFilters.test.ts` | Both vitest configs only pick up `src/**/__test__/*.test.*` — a test anywhere else silently never runs |
| Anything reaching `getModelWithConfig`/`withStructuredOutput`/embeddings | `evals/*.eval.ts` (`pnpm eval:agent`) | It calls a model — an eval, not a unit test |

`pnpm test` runs both apps; the pre-push hook runs it for the whole push.
