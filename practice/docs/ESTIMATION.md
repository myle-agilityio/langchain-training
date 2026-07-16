# Estimation Tracking

The original per-task hour estimate from planning (5 days × 8h = 40h split across two
phases), with actual status tracked against it. This file exists to catch drift early —
where we're ahead, behind, or deviated from the plan — not to log literal wall-clock time.
For scope/checklist status see [ROADMAP.md](./ROADMAP.md); for how things are built see
[ARCHITECTURE.md](./ARCHITECTURE.md).

## Phase 1 — Foundation & core assistant (Days 1–3, 24h estimated)

### Day 1 (8h estimated)

| Est. | Task | Status | Notes |
| --- | --- | --- | --- |
| 3h | Email/EmailClassification schemas + seed data | ✅ Done | Built via a faker-skeleton + LLM-prose-fill generator instead of hand-written fixtures — a scope upgrade from the original plan, not a shortcut |
| 3h | `get_emails`, `manage_emails`, `search_knowledge_base` tools | ✅ Done | `manage_emails` uses patch-by-id semantics, not the full-array-replace pattern `manage_todos` used — deliberate deviation (inbox facts like subject/body must never be model-rewritable), see ARCHITECTURE.md |
| 2h | Wire `AgentStateSchema` in `agent.ts`, drop unused todo/flight/query tools | ✅ Done | Also deleted the now-dead files outright (user-confirmed) rather than leaving them unimported |

### Day 2 (8h estimated)

| Est. | Task | Status | Notes |
| --- | --- | --- | --- |
| 3h | `compose_reply`/`finalize_email` tools with HITL pause pattern | ✅ Done | Merged into a single `compose_reply` tool — no separate finalize step needed, since `humanInTheLoopMiddleware` only runs the tool body after approval. Verified with a real interrupt/resume round-trip against a running `langgraphjs dev` server, not just typecheck |
| 2h | `stateStreamingMiddleware` wiring (live preview as the model drafts) | ⏸ Deferred | Skipped: the patch-based `manage_emails`/`compose_reply` design means the tool's raw argument shape doesn't match `state.emails`' shape, so the same "stream raw arg straight into state" trick used for todos would corrupt the frontend mid-stream. Revisit during the Day 3 UI pass if the live-typing effect turns out to matter |

**Day 2 net:** classification pulled forward + streaming middleware deferred roughly cancel out — real scope delivered (HITL drafting, verified) matches the plan even though the specific tasks shifted.

### Day 3 (8h estimated) — not started

| Est. | Task | Status |
| --- | --- | --- |
| 3h | Generative UI: email card (Approve/Reject/Send/Cancel) | ⬜ Not started |
| 2h | Inbox list + detail panel, Compose button + manual-draft form | ⬜ Not started |
| 3h | Layout pass (chat sidebar + threads + app area), end-to-end smoke test | ⬜ Not started |

## Phase 2 — Context, memory & multi-agent (Days 4–5, 16h estimated) — not started

### Day 4 (8h estimated)

| Est. | Task | Status |
| --- | --- | --- |
| 4h | Migrate `createAgent` → explicit `StateGraph` | ⬜ Not started |
| 2h | Short-term memory (thread-scoped context via checkpointer) | ⬜ Not started |
| 2h | Long-term memory (per-customer profile/tone via Store) | ⬜ Not started |

### Day 5 (8h estimated)

| Est. | Task | Status |
| --- | --- | --- |
| 2h | Guardrails (PII redaction, tone/compliance check) | ⬜ Not started |
| 2h | Time-travel replay demo | ⬜ Not started |
| 2h | Forked responses (two draft tones) | ⬜ Not started |
| 2h | Handoff / sub-agents (flagged as stretch from the start) | ⬜ Not started |

## Reading this table

- "Est." is plan-hours from the original estimate, not a literal time log — treat it as a
  scope unit, not a stopwatch.
- Update this file whenever a task's status changes, alongside ROADMAP.md/ARCHITECTURE.md
  per CLAUDE.md rule 2.
- A task landing under a different day/hour than planned isn't itself a problem — what
  matters is whether the *total* scope per phase is trending on, ahead, or behind budget.
