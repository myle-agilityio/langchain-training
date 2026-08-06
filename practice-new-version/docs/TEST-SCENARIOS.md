# Manual Test Scenarios

A click-through checklist for exercising the assistant end-to-end, from a teacher's point of
view. Scenarios use the real seed inbox (sender names are real), so you can follow along.

**How to use:** run `npm run dev`, then work through each scenario. Mark the box, and jot the
result in the **Result** line. Status key: ⬜ not run · ✅ pass · ⚠️ partial / flaky · ❌ fail.

> Model note: this runs on `gpt-4o-mini`. Small-model drift is expected on a few of these —
> the ones most affected are flagged inline.

---

## 1. Triage & classification

- [x] **1.1 Bulk triage** — Type: `Classify all the unread emails.`
  - Expect: `get_emails` → `classify_emails`; every row gets topic/course/urgency badges (workType too in the detail pane). Inbox colour-codes itself.
  - Result:  ✅ pass

- [x] **1.2 Course inferred from the math, not the grade** — Type: `What's Angelina's quiz question about, and which class is it?`
  - Expect: `math_12` inferred from the calculus content (ladder / implicit differentiation), even though the email never says "Grade 12". Repeat with **Marcus Mohr** (rational functions → `math_11`).
  - Result:  ✅ pass

- [x] **1.3 The "complex" case** — Type: `Classify Flo Beahan's email.`
  - Expect: `complex` — Flo is a parent whose email is part absence, part grade dispute, part meeting request. Forcing a single topic is a miss.
  - Result:  ✅ pass

## 2. Counting & status (anti-hallucination path)

- [x] **2.1 Exact counts** — Type: `How many unread emails do I have, and how many are about Grade 12?`
  - Expect: exact numbers (computed via SQL `GROUP BY`, not eyeballing the list).
  - Result:  ✅ pass

- [x] **2.2 Re-reads, doesn't trust stale answers** — Reply to one email in the UI, then ask the count again.
  - Expect: the number drops; it calls `get_emails` again rather than reusing its earlier answer.
  - Result:  ✅ pass

## 3. Drafting + human approval (core loop)

- [x] **3.1 Full draft flow** — Select **Ezra Konopelski** ("Absent today / test this afternoon") → **Ask AI to draft**.
  - Expect: `get_emails → classify → search_knowledge_base → compose_reply`, then an editable **approval card** in chat. Draft cites the *real* makeup policy (three school days, tutorial block), not an invented one.
  - Result:  ✅ pass

- [x] **3.2 Reject doesn't re-draft** — On that card, click **Reject**.
  - Expect: one short acknowledgement, **no second draft**. A new card appearing = regression.
  - Result:  ✅ pass

- [x] **3.3 Approve is terse** — Draft another and click **Approve & Send**.
  - Expect: card flips to "Reply sent", inbox row shows a **Replied** badge, chat says ~"Sent." — not a re-recital of the draft.
  - Result:  ✅ pass

- [x] **3.4 Classify-before-reply guard** — Pick an unclassified email and ask to reply to it directly.
  - Expect: it classifies first (records topic/course/workType/urgency), then drafts — never composes an untriaged email.
  - Result:  ✅ pass

## 4. Selection resolves "this email"

- [x] **4.1 Bare "reply this"** — Select **Felix Gislason** ("late project"), then type: `Reply this email.`
  - Expect: drafts for Felix without you naming him; the late-work policy in the draft comes from the KB (10%/day, floor of 50%).
  - Result:  ✅ pass

- [x] **4.2 Nothing selected** — With no email open, type: `Reply this email.`
  - Expect: it asks *which* email — does not guess.
  - Result: ✅ pass

## 5. Short-term memory (best demo)

- [x] **5.1 Draft survives a long thread** — In one chat thread, in order:
  1. `Draft a reply to Ezra about the missed test.` → reject the card
  2. Ask 4–5 unrelated questions (`how many unread?`, `which are high urgency?`, `anything from parents?`, …) to push the thread past ~20 messages
  3. `Make that reply shorter and less formal.`
  - Expect: it revises **Ezra's** draft, even though that turn was summarized away and you never re-named him. "Which reply?" = focus not carried.
  - Result: ✅ pass

## 6. Long-term memory (across threads)

- [x] **6.1 Remember, then recall in a new thread**
  1. Thread A: `Marcus Mohr is in my Grade 11 Period 5 class and gets extended time on assessments. Remember that.`
  2. Click **+ New** to start a fresh thread.
  3. `Draft a reply to Marcus about his practice question.`
  - Expect: the new-thread draft already knows his class/accommodation — the profile persisted in Postgres and recalled for a fresh conversation.
  - Result: ✅ pass

## 7. Guardrails (protects you)

- [x] **7.1 No promises on a grade dispute** — Select the parent email **"Request to review Katrina Fisher's test"** and ask for a draft.
  - Expect: the draft *offers the re-grade process* — never promises the score will change. "I'll raise her grade" is a serious miss.
  - Result: ✅ pass

- [x] **7.2 Sensitive data never reaches the model** — Draft a reply to any email, then check the LangSmith trace (or agent logs) for the `classify_emails`, `search_knowledge_base`, and `compose_reply` calls.
  - Expect: every prompt built from `renderEmail()` shows `[redacted email]` / `[redacted phone]` / `[redacted address]` in place of any email address, phone number, or street address in the sender line or body — the model never sees the raw value, even though the actual send still goes to the real recipient (via the email's `id`, not model output).
  - Result: ✅ pass

- [x] **7.3 Compliance flag on a risky draft** — Draft a reply to the Katrina Fisher grade-dispute email (or any email likely to produce grade-promise language) and watch the approval card.
  - Expect: if `check_compliance` flags the draft, an amber warning banner appears above the editable fields listing each violation in plain language — Approve/Reject stay available either way, since this is advisory, not a hard block.
  - Result: ✅ pass

## 8. Generative UI

- [x] **8.1 Dashboard** — Type: `Show me a dashboard of my inbox — a breakdown by topic and by urgency.`
  - Expect: `generate_a2ui` renders metric tiles + charts inline.
  - Result: ✅ pass

## 9. Manual path (no agent)

- [x] **9.1 Manual compose** — Select any email → **Compose reply** → type → **Send**.
  - Expect: writes straight to the inbox (Replied badge), no chat/agent involvement.
  - Result: ✅ pass

## 10. Data & refresh

- [x] **10.1 Refresh button** — Edit a row directly in Postgres (or reply in another tab), then click the inbox **refresh** icon.
  - Expect: the change appears — the list is a snapshot that refetches on demand.
  - Result: ✅ pass

---

## Watch on `gpt-4o-mini`

- [ ] **KB on a bare "reply this"** — via the **Ask AI to draft** button it searches the KB reliably; via a plain typed `reply this email` it often skips it. A draft stating a policy it didn't look up is the model, not a bug — route through the button.
  - Result:

- [ ] **Classification consistency** — run bulk triage (1.1) twice and compare. `complex` vs a specific topic may flip-flop; that's small-model variance, not a defect.
  - Result:
