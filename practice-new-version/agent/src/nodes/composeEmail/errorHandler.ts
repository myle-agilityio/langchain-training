import { ToolMessage } from "@langchain/core/messages";
import { Command, END, type NodeError } from "@langchain/langgraph";

import type { AgentStateShape } from "@/types/index";
import { findReplyCall } from "@/utils/index";

// Handles errors during email composition
export function composeEmailErrorHandler(
  state: AgentStateShape,
  error: NodeError,
) {
  console.error(`[compose_email] failed after retries: ${error.error.message}`);
  const call = findReplyCall(state.messages);
  return new Command({
    update: {
      messages: call
        ? [
            new ToolMessage({
              tool_call_id: call.id ?? "unknown",
              content:
                "Drafting failed unexpectedly. Tell the teacher in one short line that the draft " +
                "couldn't be prepared and to try again.",
            }),
          ]
        : [],
    },
    goto: END,
  });
}
