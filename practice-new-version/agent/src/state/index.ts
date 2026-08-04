import { z } from "zod";
import { MessagesZodState } from "@langchain/langgraph";

import { ComplianceCheckSchema, DraftSchema } from "../types/index.js";

// Shape CopilotKit's runtime injects into state on every call — context/actions from the app UI.
const CopilotKitPropertiesSchema = z
  .object({
    context: z
      .array(z.object({ description: z.string().optional(), value: z.unknown().optional() }).passthrough())
      .optional(),
    actions: z
      .array(z.object({ name: z.string(), description: z.string().optional(), parameters: z.unknown().optional() }).passthrough())
      .optional(),
  })
  .passthrough()
  .optional();

// Parent graph state. The inbox itself lives in Postgres, not here.
export const AgentState = z.object({
  ...MessagesZodState.shape,
  copilotkit: CopilotKitPropertiesSchema,
  // Set by validate_request each run; routes straight to END when true.
  outOfScope: z.boolean().default(() => false),
  summary: z.string().default(() => ""),
});

// Compose-email state: `messages` is shared with the parent; the rest are private per entry.
export const ComposeEmailState = z.object({
  ...MessagesZodState.shape,
  copilotkit: CopilotKitPropertiesSchema,
  emailId: z.string().default(() => ""),
  needsResearch: z.boolean().default(() => false),
  kbContext: z.string().default(() => ""),
  senderContext: z.string().default(() => ""),
  draft: DraftSchema.optional(),
  compliance: ComplianceCheckSchema.optional(),
});
