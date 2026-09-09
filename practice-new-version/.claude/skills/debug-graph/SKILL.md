---
name: debug-graph
description: Use when a LangGraph agent run misbehaves — a tool never gets called, the approval card never appears, graph state seems lost, or thread history doesn't persist. Real facts about this repo's wiring, not textbook LangGraph assumptions.
---

# Debug a graph run

**Use this when:** a tool never gets called, hangs, or errors; the approval interrupt never
fires; state seems lost; or thread persistence looks broken. Check the real mechanism below
before assuming standard LangGraph semantics — this repo's compose flow and error handling
both work a little differently than the main graph.

## 🔀 A tool "does nothing" when called

Check in this order:

1. Is it in **both** arrays in `tools/index.ts`? `modelTools` (bound to the model —
   `callModel.ts:61-64`) and `executableTools` (what the `ToolNode` runs —
   `routeAfterModel` in `callModel.ts:82-100` only routes to `"tools"` if the call's name is
   in `executableTools`). In `modelTools` only → the model calls it, nothing runs, silently.
2. Is `TOOL.X` used consistently — the constant, not a string literal that drifted?
3. Does the tool's `description` actually say when to use it? The system prompt does **not**
   name individual tools (`prompts/systemPrompt.ts:52-54`'s `TOOL_DESCRIPTIONS_NOTE`) — a
   vague description is the only place this can go wrong.

See [`create-tool`](../create-tool/SKILL.md) for the registration pattern in full.

## 💾 Persistence / checkpointer

Real, not CLI-only: `graphs/index.ts:95` calls `.compile({ checkpointer, store })`, both
built by `db/checkpointer.ts` (`PostgresSaver`) and `db/memoryStore.ts` (`PostgresStore`),
memoized module-level singletons. Threads and state survive a restart because the graph
itself is compiled with them.

**The compose subgraph is the exception** — `composeEmailSubgraph.ts:36` compiles with
`composeEmailWorkflow.compile()`, **no** `checkpointer`/`store` args. If state seems to
"vanish" specifically inside the triage → research → write_draft → check_compliance →
request_approval pipeline, that's not the main graph's persistence — it's this subgraph
running without one. Confirm which graph you're actually debugging before assuming a
Postgres/checkpointer problem.

## ✋ The approval interrupt

Real `interrupt()` — the only call site in `apps/agent/src` is `requestApproval.ts:17`:

```ts
const resume = interrupt({ action: COMPOSE_REPLY_ACTION, args }) as {
  decision: "approve" | "reject";
  instruction: string;
  subject?: string;
  body?: string;
};
```

Both approve and reject resume through this same node — the difference is only in what gets
returned: reject populates `lastRejectedDraft` (so a later "adjust it" has context), approve
clears it. Either way a `ToolMessage` answers the dangling `reply_to_email` call with
`resume.instruction`. If the card never appears, check the frontend side — `useInterrupt` in
`apps/web/src/hooks/useEmailAgent.tsx` — before suspecting the graph; if the graph resumes
but the wrong draft shows up, check whether `resume.subject`/`resume.body` (card edits) made
it into the payload.

## 🗄️ Contact-profile store

Only `tools/updateContactProfile.ts` touches the store: `store.get`/`store.put` against a
single namespace (`CONTACT_PROFILE_NAMESPACE`), keyed by the resolved sender email — this is
CLAUDE.md's "namespaced key, not its own table." It throws an `AppError` if `config.store` is
missing, which only happens if the graph got compiled without one — see the checkpointer
section above.

## 🧯 Error handling

Not per-node try/catch. `nodes/withNode.ts:9-44` is the one wrapper (`moderator`, `callModel`
use it) — a retryable `AppError` rethrows so the node's retry policy applies, a terminal one
becomes a chat notice. `callModel.ts` itself has no try/catch by design — a model-invoke
failure is expected to be handled by `withNode`, not caught locally. If you're chasing an
uncaught error from a node that *isn't* wrapped in `withNode`, that's the gap to fix, not a
place to add an ad hoc try/catch.

## 🔭 Observability

- **Graph-level inspection**: LangGraph Studio opens off the `:8123` dev server — see
  [`verify`](../verify/SKILL.md) for reaching it.
- **Step-by-step tracing**: no custom event emission in this repo — use LangSmith
  (`LANGSMITH_TRACING`/`LANGSMITH_API_KEY`/`LANGSMITH_PROJECT` in `apps/agent/.env.example`)
  for node-by-node runs, not console logging.
