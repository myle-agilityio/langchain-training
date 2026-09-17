// BaseStore namespace for sender profiles, namespaced per visitor id below — each teacher's
// contacts stay separate, same as USER_MEMORY_NAMESPACE. The key within it is the sender's
// email address.
export const CONTACT_PROFILE_NAMESPACE = ["contact-profiles"];

// userId matches chat_threads.user_id (see USER_ID_HEADER) — same scheme as userMemoryNamespace.
export const contactProfileNamespace = (userId: string): string[] => [
  ...CONTACT_PROFILE_NAMESPACE,
  userId,
];
