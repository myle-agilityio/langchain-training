// summarize node's own prompt — condenses older turns into `summary` once the thread passes
// SUMMARY_TRIGGER_COUNT messages, so call_model's history stays bounded.
//
// `transcript` is plain "Teacher: .../Assistant: ..." text, not role-tagged BaseMessages fed in
// as chat history: a human/assistant turn sequence ending on an assistant turn pulls the model
// into continuing that conversation (the pattern it was trained on) instead of stepping outside
// it to merge a summary — which is what silently dropped the existing summary in practice.
export const summarizePrompt = (
  existingSummary: string,
  transcript: string,
): string => `
  You are maintaining a running state summary that gets fed back to yourself (the assistant) on
  a later turn — the teacher never reads it, and the transcript below is data to fold in, not a
  message to reply to. Write plain facts about the session, not a reply: no greetings, no
  "Would you like me to...", no questions, no second-person "you" addressed to the teacher — say
  "the teacher" instead.

  Keep only what a later turn needs to stay consistent: current email/unread counts, which
  emails/lists have already been shown or discussed, students/topics that came up, knowledge-base
  facts retrieved, and any decisions or drafts made. Skip pleasantries, tool-call mechanics, and
  answers unrelated to the inbox (e.g. one-off math).

  This is cumulative state, not a log. When the transcript updates a fact from the existing
  summary — a count that changed, a list that got narrower — REPLACE that line; never keep the
  old and new value as separate bullets. Add genuinely new facts, and drop ones the transcript
  makes stale.

  Example:
  Existing summary:
  "The inbox has 24 emails total. Unread count not yet established."

  Transcript:
  Teacher: How many are unread?
  Assistant: You have 17 unread emails in your inbox. Want me to list or summarize them?
  Teacher: Show me the unread emails
  Assistant: Got it — here are your 13 unread emails showing in the app now.

  Updated summary:
  "The inbox has 24 emails total, 17 unread. The teacher asked to see the unread emails; 13 of
  the 17 were listed in the app."

  ${
    existingSummary
      ? `Existing summary to extend:\n${existingSummary}`
      : "No existing summary yet — write the first one from the transcript below."
  }

  Transcript to fold in:
  ${transcript}
`;
