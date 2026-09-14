import { Command, END, type NodeError } from "@langchain/langgraph";

import { logError } from "@/logging";
import type { AgentStateShape } from "@/types";
import { errorNotice } from "@/utils";

// Last line of defence, attached to every node except compose_email: whatever survived
// the retry policy is logged once here and turned into a chat notice the run can end on.
export const nodeErrorHandler =
  (name: string) => (_state: AgentStateShape, error: NodeError) => {
    const appError = logError(error.error, {
      node: name,
      detail: "failed after retries",
    });

    return new Command({
      update: { emailId: "", messages: errorNotice(appError) },
      goto: END,
    });
  };
