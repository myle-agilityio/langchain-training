import { ToolMessage } from "@langchain/core/messages";
import { Command, END, type NodeError } from "@langchain/langgraph";

import { logError } from "@/logging";
import type { AgentStateShape } from "@/types";
import { errorNotice, findUnansweredReplyCall } from "@/utils";

// Last line of defence, attached to every node: whatever survived the retry policy is logged
// once here and turned into a reply the run can end on.
export const nodeErrorHandler =
  (name: string) => (state: AgentStateShape, error: NodeError) => {
    const appError = logError(error.error, {
      node: name,
      detail: "failed after retries",
    });
    // A dangling reply_to_email call has to be answered or the next turn rejects the history.
    const call = findUnansweredReplyCall(state.messages);

    return new Command({
      update: {
        emailId: "",
        messages: call
          ? [
              new ToolMessage({
                tool_call_id: call.id ?? "unknown",
                content: `${appError.userMessage} Tell the teacher in one short line and stop.`,
              }),
            ]
          : errorNotice(appError),
      },
      goto: END,
    });
  };
