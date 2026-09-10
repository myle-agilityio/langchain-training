// Once the thread passes this many messages, summarize starts folding the older ones into
// `summary` every turn — keeps call_model's prompt bounded instead of growing with every turn.
export const SUMMARIZE_THRESHOLD = 10;
// call_model only reads the messages after this many — `messages` itself stays intact so the UI
// still shows full history.
export const KEEP_RECENT_COUNT = 6;
