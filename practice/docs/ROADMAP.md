# Roadmap

Building the email assistant in two phases (see [CLAUDE.md](../CLAUDE.md) for how we work).
For what's already built, see [ARCHITECTURE.md](./ARCHITECTURE.md).

- **Phase 1 — Foundation & core assistant.** Reuse this boilerplate's tools, shared-state,
  and a2ui-catalog patterns; swap the demo domain for email. Ships: classification,
  document lookup, drafting with real human-in-the-loop approval, manual compose.
  - [x] Email schema + generated mock inbox (`agent/src/tools/emails/`)
  - [x] Read/patch/lookup tools (`get_emails`, `manage_emails`, `search_knowledge_base`)
        wired into `agent.ts`; classification and document lookup work via these tools
  - [x] Drafting + real human-in-the-loop approval. Migrated to `copilotKitInterrupt` once building the UI showed — see ARCHITECTURE.md for the full "HITL architecture" writeup
  - [x] Generative UI: email reply card (Approve & Send / Reject, editable subject/body).
  - [ ] Manual compose (user drafts/sends without going through the agent)
  - [ ] Inbox list + detail panel, layout pass (chat sidebar + threads + app area)
- **Phase 2 — Context, memory & multi-agent.** Migrate `createAgent` to an explicit
  LangGraph `StateGraph`; add short/long-term memory, PII/tone guardrails, time-travel
  replay, multi-tone forked drafts, and agent handoff.

This file is updated as each phase/task ships, per the docs rule in CLAUDE.md.
