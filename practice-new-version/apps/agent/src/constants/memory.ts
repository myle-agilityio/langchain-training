// BaseStore namespace for general durable facts about the teacher — not scoped to one contact
// (contact-specific facts live under CONTACT_PROFILE_NAMESPACE instead). Namespaced per visitor
// id below, so each browser's facts stay separate — see userMemoryNamespace.
export const USER_MEMORY_NAMESPACE = ["user-memory"];
// One profile per visitor namespace, so the key within it is always this fixed value.
export const USER_MEMORY_KEY = "general";

// The store namespace holding one visitor's facts — userId matches chat_threads.user_id (see
// USER_ID_HEADER). The `memorize` node writes here every turn; callModel's renderUserMemoryContext
// reads it back the same way.
export const userMemoryNamespace = (userId: string): string[] => [
  ...USER_MEMORY_NAMESPACE,
  userId,
];
