// Short-term (thread-scoped) memory. Barrel export, matching tools/emails/.
export {
  HistoryMemorySchema,
  type HistoryMemory,
  buildModelMessages,
  renderHistorySummary,
  createSummarizeHistory,
} from "./history.js";
export {
  ContactProfileSchema,
  type ContactProfile,
  loadProfile,
  renderContactProfile,
  remember_contact,
} from "./contact-profile.js";
export {
  WorkingContextSchema,
  type WorkingContext,
  renderWorkingContext,
  recallMemory,
  trackWorkingContext,
} from "./working-context.js";
