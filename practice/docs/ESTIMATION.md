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

### Day 3 (8h estimated)

| Est. | Task | Status | Notes |
| --- | --- | --- | --- |
| 3h | Generative UI: email card (Approve/Reject/Send/Cancel) | ✅ Done | Ran over the 3h estimate — required migrating `compose_reply` off `humanInTheLoopMiddleware` to `copilotKitInterrupt` (CopilotKit doesn't understand LangChain's interrupt shape), then discovering CopilotKit's resume isn't a true `Command`-replay either, so the state mutation moved to the frontend (`agent.setState`, same pattern as the todos demo). |
| 2h | Inbox list + detail panel, Compose button + manual-draft form | ✅ Done | `src/components/email-inbox/` (list, detail, compose-form) now wired into `page.tsx` in place of the todo canvas. Manual reply writes straight to `agent.setState` — no agent/interrupt round-trip — per the "without going through the agent" requirement. The manual-compose click path is now confirmed end-to-end in a real browser (select unread email → marked read → Compose reply → fill → Send → reply thread renders with correct timestamp → row shows "Replied" badge), zero console errors |
| 3h | Layout pass (chat sidebar + threads + app area), end-to-end smoke test | ✅ Done | Default `ExampleLayout` mode changed from `"chat"` to `"app"` (`src/components/example-layout/index.tsx`) so the inbox + chat render side by side on load instead of landing on an empty chat-only screen — the only change needed, since threads drawer + chat + app-area already coexisted, just not by default. Asked the agent to triage the duplicate-charge email → it called `get_emails` → `search_knowledge_base` → `manage_emails` (classified Billing/high) → `compose_reply` → `EmailReplyCard` rendered → approved → inbox row updated to "Replied" live. |

**Day 3 net:** the Generative UI task alone absorbed effort well beyond its 3h estimate
(two architecture pivots plus a dependency-compatibility bug); the inbox/compose task
is implemented. The layout-pass task is landed.
Phase 1 is complete.

### Post-Phase-1 fix: shared inbox (unplanned, ~1h)

Threads shipped in Day 3's layout pass, which exposed a bug the original plan hadn't
anticipated: `emails` lived in per-thread `agent.state`, so each thread forked its own copy
of the inbox instead of sharing one. Fixed by moving the inbox onto LangGraph's cross-thread
`Store` — see ARCHITECTURE.md. Note: this pulls forward the *mechanism* Phase 2 Day 4
planned to use for long-term memory ("per-customer profile/tone via Store"), just applied to
the inbox instead of customer profiles. Not scope creep on Day 4's task itself, but worth
knowing the Store is already wired in when that task starts.

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
