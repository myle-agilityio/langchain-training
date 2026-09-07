import { tool } from "@langchain/core/tools";
import { z } from "zod";

import { TOOL } from "@repo/constants";

// Never executed as a tool — the router turns this call into a compose-email subgraph entry, so
// it stays on the raw tool() helper rather than defineTool's envelope.
export const reply_to_email = tool(async () => "", {
  name: TOOL.REPLY_TO_EMAIL,
  description:
    "Draft a reply to one email and show it to the teacher for approval. Give the email's " +
    "id. Only for an explicit request to reply/draft/respond. When this tool is the " +
    "right call, it runs the whole pipeline itself — classify, look up policy, draft — so do " +
    "not call the classify or knowledge-base tools first. Nothing is sent without the teacher " +
    "approving the draft on screen.",
  schema: z.object({ id: z.string() }),
});
