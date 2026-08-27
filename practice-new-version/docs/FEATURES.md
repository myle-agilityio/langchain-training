# Features

User stories for the AI Email Assistant, from the teacher's point of view. For how it's built,
see [ARCHITECTURE.md](./ARCHITECTURE.md); for click-through steps to try each of these, see
[TEST-SCENARIOS.md](./TEST-SCENARIOS.md).

## Triage & classification

**Teacher can** get emails auto-tagged with topic, course, work type, and urgency, **so that**
they can scan the state of their inbox without opening every email.

- Course is inferred from the math content itself (e.g. implicit differentiation → `math_12`),
  not from stated grade level.
- A genuinely mixed email (part absence, part grade dispute, part meeting request) is tagged
  `complex` instead of forced into one topic.
- Classifying is a bulk action ("classify all unread") or a single-email action.

## Exact inbox counts

**Teacher can** get exact answers to "how many" questions, **so that** they can trust the
numbers instead of an eyeballed guess.

- Counts are computed with a real query (`GROUP BY`), never by counting a fetched list.
- A count asked again after a reply reflects the change — it re-queries, not caches.

## Draft, review, and approve replies

**Teacher can** have the assistant draft a reply and approve it before anything sends,
**so that** they stay in control of what goes to parents and students.

- Draft appears as an editable card in chat; nothing sends until **Approve** is clicked.
- **Reject** ends the turn with a short acknowledgement — it does not silently redraft.
- An unclassified email is classified automatically before a reply is drafted for it.
- Selecting an email and saying "reply this" resolves to that email without naming it.

## Policy-grounded drafts

**Teacher can** get replies that cite the actual school and course policies, **so that** they
never send a rule they didn't mean to commit to.

- Late-work, makeup-test, grading, and calculator replies pull from a searchable knowledge
  base instead of an invented rule.
- Cited details (penalty %, floor, makeup window/location) match the real policy text.

## Related knowledge in the reading pane

**Teacher can** see knowledge-base articles relevant to the open email without asking the
assistant, **so that** they can check the policy themselves before deciding how to reply.

- Opening an email searches the same knowledge base the assistant's drafts pull from; a
  matching article appears as a small card in the reading pane, with no chat turn involved.
- An email with no matching policy shows a "no articles found" message instead of an empty
  card; a failed search shows an error message instead.

## Guardrail: no promises on grade disputes

**Teacher can** trust that grade-dispute drafts offer the review process rather than a result,
**so that** they never accidentally commit to changing a grade before reviewing it.

- Draft offers the re-grade process; it never asserts the grade will change.

## Guardrail: compliance check before approval

**Teacher can** have risky drafts flagged before they see them, **so that** they catch problem
language without proofreading every draft themselves.

- Every draft passes a compliance check before reaching the approval card.
- A flagged draft shows an amber banner listing each violation in plain language.
- The check is advisory — Approve/Reject stay available either way.

## Guardrail: blocks unsafe or abusive input

**Teacher (and the assistant) can** be protected from abusive, threatening, or manipulative chat
messages, **so that** a bad-faith message never reaches the model's normal reasoning or tools.

- Harassment, threats, sexual content, or an attempt to override the assistant's instructions is
  blocked before `call_model` runs, with a short decline message in its place.
- A blunt or frustrated tone, venting, or an ordinary out-of-scope request is **not** flagged —
  only genuine abuse is.

## Guardrail: no PII sent to the model

**Teacher can** trust that contact details are kept out of the model's prompts, **so that**
student/parent PII isn't exposed to the LLM provider.

- Email addresses, phone numbers, and street addresses are redacted before any prompt is built.
- The actual send still reaches the real recipient (via the email's id), unaffected by redaction.

## Remembers within a conversation

**Teacher can** rely on the assistant tracking what's being discussed across a long chat,
**so that** they don't have to re-identify the email they're talking about every turn.

- "Make that reply shorter" resolves to the right draft even 20+ messages later, past what got
  summarized out of context.

## Remembers across conversations

**Teacher can** have facts they've told the assistant persist between chat threads, **so that**
they don't have to repeat student context every time they start a new conversation.

- A fact stated in one thread (e.g. a student's testing accommodation) is recalled automatically
  in a brand-new thread, unprompted.

## Generative inbox dashboard

**Teacher can** get a visual breakdown of their inbox on request, **so that** they can see the
shape of their workload at a glance instead of reading a list.

- "Show me a dashboard — breakdown by topic and urgency" renders metric tiles and charts inline
  in chat, built live from current inbox state.

## Filter the inbox list

**Teacher can** narrow the inbox list down to a subset, **so that** they can focus on one slice
of it (e.g. unread, high-urgency, one course) instead of scrolling the whole thing.

- Filter dialog covers status, urgency, grade, topic, work type, sender, subject, body text,
  and received-date range; the filter icon shows an indicator when any are active.
- The same filters can be set from chat ("only show high-urgency Grade 12 emails") — a chat
  request and the dialog change the same view, not two separate mechanisms.
- The dashboard and count features above act on the full inbox regardless of the current filter;
  filtering only changes what's visible in the list.

## Mark emails read or unread

**Teacher can** control each email's read state, **so that** the inbox reflects what they've
actually looked at, not just what the assistant has touched.

- Opening an email in the reading pane marks it read automatically.
- Each row has a manual "mark as read" / "mark as unread" toggle.
- "Mark all as read/unread" applies to the current filtered view, and never touches a replied or
  flagged-for-follow-up email, so a bulk action can't erase that status by accident.

## Switch between chat-only and split views

**Teacher can** toggle between a full chat screen and a side-by-side chat + inbox layout,
**so that** they can focus on the conversation or work the inbox directly, and resize the split
to whichever they're using more.

- **Chat** mode is full-width conversation; **App** mode splits chat and inbox side by side with
  a draggable, resizable divider.
- The assistant can also switch modes itself when the flow calls for it (e.g. opening the inbox
  view to show a result).

## Multiple conversations

**Teacher can** keep separate chat threads and switch between them, **so that** one
long-running conversation doesn't get in the way of starting a fresh, unrelated question.

- A threads drawer lists past conversations; picking one resumes it, **+ New** starts a clean
  thread without losing the others.

## Manual reply path

**Teacher can** write and send a reply themselves without the assistant, **so that** they're
not blocked by the agent for something they'd rather just type.

- Select an email → **Compose reply** → type → **Send** writes straight to the inbox.
- No chat or model call is involved in this path.

## Live inbox refresh

**Teacher can** refresh the inbox list to reflect changes made elsewhere, **so that** they're
never acting on stale data.

- Refresh icon refetches the list on demand — picks up edits from another tab or a direct
  database change.
