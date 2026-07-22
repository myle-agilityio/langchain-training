# Roadmap

Building the email assistant in two phases (see [CLAUDE.md](../CLAUDE.md) for how we work).
For what's already built, see [ARCHITECTURE.md](./ARCHITECTURE.md).

- **Phase 1 — Foundation & core assistant.** ✅ Complete. Reuse this boilerplate's tools,
  shared-state, and a2ui-catalog patterns; swap the demo domain for email. Ships:
  classification, document lookup, drafting with real human-in-the-loop approval, manual
  compose.
  - [x] Email schema + generated mock inbox (`agent/src/tools/emails/`)
  - [x] Read/patch/lookup tools (`get_emails`, `manage_emails`, `search_knowledge_base`)
        wired into `agent.ts`; classification and document lookup work via these tools
  - [x] Drafting + real human-in-the-loop approval via a LangGraph `interrupt()` (initially the `copilotKitInterrupt` helper, later switched to raw `interrupt()` — the helper swallows the pause on langgraph 1.4.x; see ARCHITECTURE.md's HITL note)
  - [x] Generative UI: email reply card (Approve & Send / Reject, editable subject/body).
  - [x] Manual compose (user drafts/sends without going through the agent)
  - [x] Inbox list + detail panel (`src/components/email-inbox/`), now `page.tsx`'s
        app-mode content in place of the todo canvas
  - [x] Layout pass (chat sidebar + threads + app area) — app-mode (inbox + chat side by
        side) is now the default landing view instead of chat-only
  - [x] Shared inbox fix — moved `emails` off per-thread `agent.state` onto LangGraph's
        cross-thread Store so the inbox is common across every thread instead of forking a
        copy per checkpoint (see ARCHITECTURE.md's "Shared inbox" section)
  - [x] Domain re-theme — SaaS support inbox → a high school math teacher's inbox
        (Grade 11 / Grade 12). Classification went from one axis (`category`) to three
        (`topic` + `course` + `workType`, plus `urgency`); `bug_filed` → `flagged_for_followup`;
        seed data and knowledge base rewritten for school policy + Grade 11/12 curriculum.
        Data and copy only — no change to the graph, tools, store, or HITL flow. See
        ARCHITECTURE.md's "Domain" section.
- **Phase 2 — Context, memory & multi-agent.** Migrate `createAgent` to an explicit
  LangGraph `StateGraph`; add short/long-term memory, PII/tone guardrails, time-travel
  replay, multi-tone forked drafts, and agent handoff.

This file is updated as each phase/task ships, per the docs rule in CLAUDE.md.
