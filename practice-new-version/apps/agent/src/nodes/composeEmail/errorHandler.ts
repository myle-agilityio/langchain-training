import { ToolMessage } from "@langchain/core/messages";
import { Command, END, type NodeError } from "@langchain/langgraph";

import { toAppError } from "@/errors";
import type { AgentStateShape } from "@/types";
import { errorNotice, findUnansweredReplyCall } from "@/utils";

// compose_email's own backstop. Its subgraph nodes are wrapped in withNode too, so the failing
// attempt was already logged — this only decides how to answer the turn and ends the run.
export const composeEmailErrorHandler = (
  state: AgentStateShape,
  error: NodeError,
) => {
  const appError = toAppError(error.error);

  // If the compose_email subgraph failed, it may have left a dangling reply_to_email tool call
  // Need to find it and answer it with the error message.
  const call = findUnansweredReplyCall(state.messages);

  // A ToolMessage never renders as a chat bubble on its own — call_model has to read it and
  // narrate it to the teacher. An errorNotice AIMessage is already teacher-visible, so that
  // branch can end the run directly.
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
    goto: call ? "call_model" : END,
  });
};
