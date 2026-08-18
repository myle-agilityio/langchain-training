import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { getPlainModelForConfig } from "@/config/model";
import { CONTACT_PROFILE_NAMESPACE } from "@/constants/index";
import { getEmail } from "@/db/index";
import { draftPrompt } from "@/prompts/index";
import {
  DraftSchema,
  type ComposeEmailStateShape,
  type ContactProfileValue,
} from "@/types/index";
import { collectRevisionNotes } from "@/utils/index";
import { hidden } from "./shared";

// write_draft — email + researched context in, subject/body out. The sender profile is read here,
// not in research: it's a cheap key lookup every draft should see, even when the KB isn't needed.
export async function writeDraft(
  state: ComposeEmailStateShape,
  config: LangGraphRunnableConfig,
) {
  const email = await getEmail(state.emailId);
  if (!email) return {};

  const profile = (
    await config.store?.get(CONTACT_PROFILE_NAMESPACE, email.from.email)
  )?.value as ContactProfileValue | undefined;
  const senderContext = profile
    ? [
        profile.name ? `Name: ${profile.name}` : "",
        profile.tone ? `Preferred tone: ${profile.tone}` : "",
        profile.facts?.length ? `Known facts: ${profile.facts.join("; ")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  // Only revise the rejected draft when this compose is for the same email.
  const previousDraft =
    state.lastRejectedDraft?.emailId === state.emailId
      ? state.lastRejectedDraft
      : undefined;

  const draft = await getPlainModelForConfig(config)
    .withStructuredOutput(DraftSchema)
    .invoke(
      draftPrompt({
        email,
        kbContext: state.kbContext,
        senderContext,
        revisionNotes: collectRevisionNotes(state.messages, state.emailId),
        previousDraft,
      }),
      hidden(config),
    );
  return { draft, senderContext };
}
