---
name: add-agent-tool
description: Use when wiring a brand-new agent tool end to end — a LangGraph tool through to its CopilotKit render and generative UI card. Use create-tool instead for a backend-only tool with no card.
---

# Add an agent tool, end to end

**Use this when:** the model needs a new capability that also needs a rendered card in the
inbox chat — not just a backend-only tool (that's [`create-tool`](../create-tool/SKILL.md)).

## Why this is a checklist, not a paragraph

A new tool touches ~6 files across two apps. Missing one doesn't fail the build — the tool
silently never reaches the model, or reaches it and does nothing when called, or runs but
renders nothing. Traced from `get_emails` → `GetEmailsCard`'s actual wiring.

## 🔧 Backend (`apps/agent/src`)

1. `tools/<name>.ts` — build it with [`create-tool`](../create-tool/SKILL.md)'s pattern
   (`defineTool`).
2. `tools/index.ts` — add the export to **both** arrays:

   ```ts
   export const modelTools = [get_emails, /* ... */, your_tool];
   export const executableTools = [get_emails, /* ... */, your_tool];
   ```

   These are two different gates. `modelTools` is what `callModel.ts` binds to the model —
   missing here, the LLM never sees it exist. `executableTools` is what the `ToolNode`
   actually runs when called (`routeAfterModel` in `callModel.ts:82-100` routes any call
   whose name is in `executableTools` to `"tools"`) — missing here, the model can call it but
   nothing executes. **The only reason to skip `executableTools`** is a routing-only tool like
   `reply_to_email`, which never runs as a tool at all — see `create-tool` for that exception.
3. `TOOL` in `@repo/constants` — add the name constant; tools reference `TOOL.X`, never a
   string literal.
4. **You do not need to touch the system prompt.** `prompts/systemPrompt.ts`'s
   `TOOL_DESCRIPTIONS_NOTE` says explicitly: the tool's own `description` is what tells the
   model when to use it — don't duplicate that in `SYSTEM_PROMPT`.

## 🖥️ Frontend (`apps/web/src`)

5. `components/generativeUI/toolCards/<Name>/index.tsx` (+ its `*.stories.tsx`) — the card.
   Reads `props.result` via `parseToolResult` (`@/utils`) to unwrap the `{ok,data}` /
   `{ok:false,error}` envelope `defineTool` produces.
6. `toolCards/index.ts` — add `export * from "./<Name>"`. Nothing else to touch —
   `generativeUI/index.ts` already re-exports `toolCards` as a whole, and `hooks/index.ts`
   already exports `useToolRenderers`.
7. `hooks/useToolRenderers.tsx` — add a `useRenderTool` block:

   ```tsx
   useRenderTool(
     {
       name: TOOL.YOUR_TOOL,
       parameters: z.object({ /* mirrors the agent's input schema */ }),
       render: (props) => <YourCard {...props} />,
     },
     [],
   );
   ```

   A name-scoped `useRenderTool` here wins over the wildcard fallback in
   `useGenerativeUIExamples` — an unregistered tool call renders as a generic
   `<ToolReasoning>` card instead, which is how you can tell step 7 got skipped.

## Then

Run [`review-copilotkit-layers`](../review-copilotkit-layers/SKILL.md) against the new
tool/hook/card trio before treating it as done, then [`verify`](../verify/SKILL.md) and
[`review`](../review/SKILL.md).
