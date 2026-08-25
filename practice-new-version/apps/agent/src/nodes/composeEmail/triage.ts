import { ToolMessage } from "@langchain/core/messages";
import { END, type LangGraphRunnableConfig } from "@langchain/langgraph";

import { getPlainModelForConfig, hidden } from "@/config/model";
import { needsResearchPrompt } from "@/prompts";
import { classifyEmail } from "@/tools";
import { NeedsResearchSchema, type ComposeEmailStateShape } from "@/types";
import { fetchEmailById, findReplyCall } from "@/utils";

// triage — resolve the email, classify it (skipped if already on file), decide if drafting
// needs KB research. A fixed node, not a tool, so the model can't skip classification.
export const triage = async (
  state: ComposeEmailStateShape,
  config: LangGraphRunnableConfig,
) => {
  const call = findReplyCall(state.messages);
  const id = (call?.args as { id?: string } | undefined)?.id ?? "";
  const email = id ? await fetchEmailById(id) : null;

  if (!email) {
    // Answer the dangling tool call so the model can recover.
    return {
      emailId: "",
      messages: [
        new ToolMessage({
          tool_call_id: call?.id ?? "unknown",
          name: "reply_to_email",
          content: `No email with id "${id}". Call get_emails for current ids, then retry.`,
        }),
      ],
    };
  }

  if (!email.classification) {
    const result = await classifyEmail(id, config);

    email.classification = result.ok ? result.classification : undefined;
  }

  const { needsResearch } = await getPlainModelForConfig(config)
    .withStructuredOutput(NeedsResearchSchema)
    .invoke(needsResearchPrompt(email), hidden(config));

  return { emailId: email.id, needsResearch };
};

export const afterTriage = (state: ComposeEmailStateShape) => {
  if (!state.emailId) {
    return END;
  }

  return state.needsResearch ? "research" : "write_draft";
};
