import { AIMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { END, type LangGraphRunnableConfig } from "@langchain/langgraph";
import { copilotkitCustomizeConfig } from "@copilotkit/sdk-js/langgraph";

import { getPlainModelForConfig, MissingApiKeyError } from "@/config/model";
import { moderationPrompt } from "@/prompts/index";
import { ModerationCheckSchema, type AgentStateShape } from "@/types/index";

// System prompt + full history, so a jailbreak attempt built up gradually across turns is still
// visible, not just judged from the latest message in isolation.
const moderationPromptTemplate = ChatPromptTemplate.fromMessages([
  ["system", moderationPrompt()],
  new MessagesPlaceholder("messages"),
]);

// Flags unsafe/abusive chat input before it reaches call_model. Distinct from SCOPE_GUIDE
// (capability boundaries, checked inline in call_model) and check_compliance (drafted replies).
export const moderator = async (
  state: AgentStateShape,
  config: LangGraphRunnableConfig,
) => {
  const last = state.messages[state.messages.length - 1];
  if (!HumanMessage.isInstance(last)) return { blocked: false };

  let plainModel;
  try {
    plainModel = getPlainModelForConfig(config);
  } catch (error) {
    if (!(error instanceof MissingApiKeyError)) throw error;
    return {
      blocked: true,
      messages: [
        new AIMessage({
          id: crypto.randomUUID(),
          content:
            "I don't have an OpenAI API key to work with yet — enter yours in the box on " +
            "screen, then try again.",
        }),
      ],
    };
  }

  const chain = moderationPromptTemplate.pipe(
    plainModel.withStructuredOutput(ModerationCheckSchema),
  );
  // withStructuredOutput is a forced tool call — hide it, or the raw {flagged, declineMessage} would stream to chat.
  const runConfig = copilotkitCustomizeConfig(config, {
    emitMessages: false,
    emitToolCalls: false,
  });
  const check = await chain.invoke({ messages: state.messages }, runConfig);

  if (!check.flagged) return { blocked: false };
  return {
    blocked: true,
    messages: [
      new AIMessage({
        id: crypto.randomUUID(),
        content: check.declineMessage ?? "I can't help with that.",
      }),
    ],
  };
};

// Routes to call_model or ends if the message was flagged
export const afterModeration = (state: AgentStateShape) => state.blocked ? END : "call_model";
