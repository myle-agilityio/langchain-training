---
name: create-tool
description: Use when writing or reviewing a single LangChain tool in apps/agent/src/tools/ — a backend-only tool, or an additional tool with no dedicated frontend card. Use add-agent-tool instead when it also needs a rendered card.
---

# Create a tool

**Use this when:** adding a backend-only tool, or a tool with no dedicated UI card. Adding a
tool that also needs a rendered card end to end? Use
[`add-agent-tool`](../add-agent-tool/SKILL.md) instead — its backend step is this skill's
checklist, plus the frontend wiring on top.

## The shape, every time

Every tool in this repo is `defineTool({ run, name, description, schema })` — see
[`shared`](../shared/SKILL.md)'s zod convention for the schema itself. From
`tools/getEmails.ts`:

```ts
export const get_emails = defineTool({
  run: async ({ filter }) => {
    const emails = await listEmails(filter);
    return { emails: emails.map(redactEmailForModel), count: emails.length };
  },
  name: TOOL.GET_EMAILS,
  description: "List emails ... " /* what it's for AND when to use it — see below */,
  schema: z.object({ filter: EmailFilterSchema.optional() }),
});
```

`run` returns **plain data** — no `JSON.stringify`, no try/catch. `defineTool`
(`tools/defineTool.ts:28-59`) is the single wrapper for every tool: it catches whatever `run`
throws, logs it with the tool name, and returns `JSON.stringify({ok:true, data})` on success
or `JSON.stringify({ok:false, error})` on failure. **This is not something to hand-roll** —
unlike some LangChain setups, forgetting to stringify isn't a footgun here because `run`
never stringifies anything itself.

## The rule that silently breaks things here

Not the return contract — it's **registration**. `run` alone doesn't reach the model or ever
get called; see [`add-agent-tool`](../add-agent-tool/SKILL.md) step 2 for the two-array gate
(`modelTools` vs `executableTools`) every tool must clear. Building the tool and forgetting
that step is the actual footgun in this codebase.

## The `reply_to_email` exception

One tool skips `defineTool` entirely: `tools/replyToEmail.ts` uses the raw `tool()` helper
and returns `""`, because it's never executed — `routeAfterModel` (`callModel.ts:91`) diverts
any call to it into the compose-email subgraph instead of the `ToolNode`. It's in
`modelTools` only, not `executableTools`. Only follow this pattern for a tool that's
genuinely routing-only; every other tool goes through `defineTool`.

## Writing the description

There's no separate place tool usage guidance goes — `description` is the only place the
model reads "when to use this." Say what it's for, when to call it instead of a nearby tool
(`get_emails`'s description tells the model to call `count_emails` for "how many" questions
rather than counting the array itself), and what the result is good for (whether the model
needs to restate it, or it renders as a card already).

## After writing the tool

1. Register in `tools/index.ts` — see [`add-agent-tool`](../add-agent-tool/SKILL.md) step 2.
2. Add the `TOOL` constant in `@repo/constants`.
3. If a frontend card also renders this tool's result, finish the wiring via
   [`add-agent-tool`](../add-agent-tool/SKILL.md)'s frontend steps, then run
   [`review-copilotkit-layers`](../review-copilotkit-layers/SKILL.md) before calling it done.
