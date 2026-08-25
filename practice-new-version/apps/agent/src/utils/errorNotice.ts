import { AIMessage } from "@langchain/core/messages";

import type { AppError } from "@/errors/index";

// The one way an agent-side failure reaches the teacher: chat text carrying the catalog's
// user message (generic when the error isn't one we're willing to describe).
export const errorNotice = (error: AppError) => [
  new AIMessage({ id: crypto.randomUUID(), content: error.userMessage }),
];
