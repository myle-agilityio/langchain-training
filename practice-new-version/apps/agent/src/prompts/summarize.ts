// summarize node's own prompt — condenses older turns into `summary` once the thread passes
// SUMMARY_TRIGGER_COUNT messages, so call_model's history stays bounded.
export const summarizePrompt = (existingSummary: string): string => `
  Summarize the conversation below in a few sentences, keeping only what the assistant will
  need later: what the teacher asked, which emails/students/topics came up, and any decisions
  or drafts made. Skip pleasantries and tool-call mechanics.

  ${
    existingSummary
      ? `Extend this existing summary with the new messages below, don't restart it:\n${existingSummary}`
      : "Write a new summary from the messages below."
  }
`;
