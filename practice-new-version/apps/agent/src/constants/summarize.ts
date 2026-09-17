// Once pending user messages pass this, summarize folds the oldest SUMMARIZE_BATCH_USER_MESSAGES
// turns into `summary` — counted in user messages, not raw count, so tool calls don't skew it.
export const SUMMARIZE_TRIGGER_PENDING_USER_MESSAGES = 6;
// How many of the oldest pending turns (a user message plus everything it triggered) get folded
// into `summary` per summarize run.
export const SUMMARIZE_BATCH_USER_MESSAGES = 3;
