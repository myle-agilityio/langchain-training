export const SUGGESTION_COUNT = 3;
// Only the tail of the thread: a follow-up builds on what was just said, and sending the whole
// history would grow the prompt (and the wait) without bound as the thread gets longer.
export const RECENT_MESSAGE_COUNT = 2;
