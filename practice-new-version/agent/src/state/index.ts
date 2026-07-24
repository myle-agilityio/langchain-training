import { z } from "zod";
import { StateSchema } from "@langchain/langgraph";
import { CopilotKitStateSchema, zodState } from "@copilotkit/sdk-js/langgraph";

import { DraftSchema } from "../types/index.js";

// Parent graph state. The inbox itself lives in Postgres, not here.
export const AgentState = new StateSchema({
  ...CopilotKitStateSchema.fields,
});

// Compose-email state: `messages` is shared with the parent; the rest are private per entry.
export const ComposeEmailState = new StateSchema({
  ...CopilotKitStateSchema.fields,
  emailId: zodState(z.string().default(() => "")),
  kbContext: zodState(z.string().default(() => "")),
  senderContext: zodState(z.string().default(() => "")),
  draft: zodState(DraftSchema.optional()),
});
