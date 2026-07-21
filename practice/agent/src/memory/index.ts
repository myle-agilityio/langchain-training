// Short-term (thread-scoped) memory. Barrel export, matching tools/emails/.
export {
  HistoryMemorySchema,
  type HistoryMemory,
  buildModelMessages,
  renderHistorySummary,
  createSummarizeHistory,
} from "./history.js";
export {
  CustomerProfileSchema,
  type CustomerProfile,
  loadProfile,
  renderCustomerProfile,
  remember_customer,
} from "./customer-profile.js";
export {
  WorkingContextSchema,
  type WorkingContext,
  renderWorkingContext,
  recallMemory,
  trackWorkingContext,
} from "./working-context.js";
