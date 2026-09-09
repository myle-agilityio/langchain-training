---
name: verify
description: Run the email assistant end-to-end to prove a change works — start the agent and UI, exercise the flow through the chat, then tear the servers down. Use before calling any agent, tool, node, or UI change done.
---

# Verify a feature end-to-end

**Use this when:** proving an agent/tool/node/UI change actually works, before calling it
done. Typechecking is not verification — a tool can compile and still never get called,
return a shape the UI can't render, or skip the approval interrupt. Drive the real flow.

## 1. 🔧 Preconditions

`.env` needs `OPENAI_API_KEY` and `DATABASE_URL`. Tables are created on first connect, so
there is no migration step — but a wrong/unreachable `DATABASE_URL` surfaces as an agent that
starts fine and then fails on the first inbox tool call, which is easy to misread as a tool bug.

## 2. ▶️ Start what you need

Start the narrowest thing that can prove the change, in the background:

| Change | Start | Check |
| --- | --- | --- |
| Tool logic, graph wiring, state shape | `pnpm dev:agent` → :8123 | `http://localhost:8123/ok` before assuming a failure is yours |
| Generative UI, interrupts, anything the user sees | `pnpm dev` → :3000 and :8123 | both ports up |

## 3. 🧪 Exercise the actual path

Pick the flow that would break if the change were wrong, and run it:

- New/changed tool → send a message that forces that tool call, and check the tool's
  _return_ reaches state, not just that it ran.
- Classification → classify a real seeded email and confirm the badge row renders fully
  (classification is all-or-nothing; a partial one renders half-filled).
- Approval interrupt → confirm it actually pauses, and that rejecting leaves state unchanged.
- Subgraph change → confirm control returns to the parent graph with the expected state keys.

Prefer LangGraph Studio (opens off the :8123 dev server) for graph-level inspection, and the
chat UI for anything the teacher would see.

## 4. 📝 Report honestly

Say what you exercised and what you didn't. "Classified email #3 end-to-end in the UI; did
not test the reject branch of the interrupt" is a useful report. "Verified" is not.

## 5. 🧹 Tear down

Always — even if verification failed, even if you plan to start it again next turn. See
[`review`](../review/SKILL.md) for the actual teardown command and checklist.
