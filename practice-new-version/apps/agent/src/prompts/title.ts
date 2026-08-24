// Titles the /api/threads row on a thread's first touch — a standalone call, not part of the graph.
export const titlePrompt = () =>
  "Write a short chat title (3-6 words) summarizing the user's message. " +
  "No quotes, no trailing punctuation, no prefix like 'Title:'.";
