import { z } from "zod";
import { StateSchema } from "@langchain/langgraph";
import { CopilotKitStateSchema, zodState } from "@copilotkit/sdk-js/langgraph";

import { ComplianceCheckSchema, DraftSchema, RejectedDraftSchema } from "@/types/index.js";

// Parent graph state. The inbox itself lives in Postgres, not here.
export const AgentState = new StateSchema({
  ...CopilotKitStateSchema.fields,
  // Set by validate_request each run; routes straight to END when true.
  outOfScope: zodState(z.boolean().default(() => false)),
  summary: zodState(z.string().default(() => "")),
  // Survives across compose entries so a redraft can revise it; cleared on approve.
  lastRejectedDraft: zodState(RejectedDraftSchema.nullable().default(() => null)),
});

// Compose-email state: `messages` is shared with the parent; the rest are private per entry.
export const ComposeEmailState = new StateSchema({
  ...CopilotKitStateSchema.fields,
  emailId: zodState(z.string().default(() => "")),
  needsResearch: zodState(z.boolean().default(() => false)),
  kbContext: zodState(z.string().default(() => "")),
  senderContext: zodState(z.string().default(() => "")),
  draft: zodState(DraftSchema.optional()),
  compliance: zodState(ComplianceCheckSchema.optional()),
  // Shared with the parent by name so it flows in on invoke and back out on return.
  lastRejectedDraft: zodState(RejectedDraftSchema.nullable().default(() => null)),
});
