// Two configs, split by availability: curated pills on the empty welcome screen (no chat
// context to work from yet), then agent-generated ones off the live conversation.
import { useConfigureSuggestions } from "@copilotkit/react-core/v2";

const DYNAMIC_INSTRUCTIONS = `You are suggesting the next thing a high-school math teacher could
say to their inbox assistant. Read the conversation so far and propose follow-ups that build on
it — the emails, drafts, or findings already discussed — never generic inbox advice.

Rules:
- Each suggestion must be a concrete next step the assistant can carry out with its tools:
  searching the inbox, drafting a reply for approval, answering from the knowledge base, or
  showing a dashboard.
- Refer to the specific emails, senders, or topics from the conversation by name.
- Never suggest work the conversation already shows done. If the inbox was already classified,
  do not suggest classifying it — suggest what to do with the result instead.
- title: at most 5 words.
- message: an instruction the teacher gives the assistant, like "Draft a reply to Ezra about the
  retake, for my approval." Never the text of an email to the sender.`;

export const useChatSuggestions = () => {
  useConfigureSuggestions({
    available: "always",
    instructions: DYNAMIC_INSTRUCTIONS,
    minSuggestions: 2,
    maxSuggestions: 3,
  });
};
