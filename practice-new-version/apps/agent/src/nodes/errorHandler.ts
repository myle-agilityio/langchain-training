import { Command, END, type NodeError } from "@langchain/langgraph";

import { toAppError } from "@/errors";
import type { AgentStateShape } from "@/types";
import { errorNotice } from "@/utils";

// Last line of defence, attached to every node except compose_email: withNode already logged
// the failing attempt, so this only turns it into a chat notice and ends the run.
export const nodeErrorHandler = (_state: AgentStateShape, error: NodeError) => {
  const appError = toAppError(error.error);

  return new Command({
    update: { emailId: "", messages: errorNotice(appError) },
    goto: END,
  });
};
