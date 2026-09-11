// BaseStore namespace for general durable facts about the teacher — not scoped to one contact
// (contact-specific facts live under CONTACT_PROFILE_NAMESPACE instead).
export const USER_MEMORY_NAMESPACE = ["user-memory"];
// One teacher uses this app, so there's exactly one profile to store — a fixed key, not a
// per-user id.
export const USER_MEMORY_KEY = "general";
// BaseStore namespace tracking, per thread id, how many of that thread's messages have already
// been scanned for durable facts. extractMemoryForThread runs when the teacher abandons a thread
// for a new one (not per turn), so this is what lets reopening an old thread and abandoning it
// again pick up where extraction left off instead of re-scanning the whole transcript.
export const MEMORY_CHECKPOINT_NAMESPACE = ["user-memory-checkpoints"];
