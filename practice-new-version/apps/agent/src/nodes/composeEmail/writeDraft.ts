import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { getPlainModelWithConfig, getUserIdFromConfig, hidden } from "@/config";
import {
  USER_MEMORY_KEY,
  contactProfileNamespace,
  userMemoryNamespace,
} from "@/constants";
import { getEmail, getMemoryStore } from "@/db";
import { draftPrompt } from "@/prompts";
import {
  DraftSchema,
  type ComposeEmailStateShape,
  type ContactProfileValue,
  type UserMemoryValue,
} from "@/types";
import { collectRevisionNotes } from "@/utils";
import { withNode } from "../withNode";

// write_draft — email + researched context in, subject/body out. The sender profile is read here,
// not in research: it's a cheap key lookup every draft should see, even when the KB isn't needed.
export const writeDraft = withNode(
  "write_draft",
  async (state: ComposeEmailStateShape, config: LangGraphRunnableConfig) => {
    const email = await getEmail(state.emailId);

    if (!email) {
      return {};
    }

    // Reads the PostgresStore directly, not config.store — see updateContactProfile.ts.
    const store = await getMemoryStore();
    const userId = getUserIdFromConfig(config);
    const profile = userId
      ? ((await store.get(contactProfileNamespace(userId), email.from.email))
          ?.value as ContactProfileValue | undefined)
      : undefined;
    const senderContext = profile
      ? [
          profile.name ? `Name: ${profile.name}` : "",
          profile.tone ? `Preferred tone: ${profile.tone}` : "",
          profile.facts?.length
            ? `Known facts: ${profile.facts.join("; ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    // Same store, this visitor's own namespace — the durable facts `memorize` collects about the
    // teacher, not this one sender (that's senderContext above).
    const userMemory = userId
      ? ((await store.get(userMemoryNamespace(userId), USER_MEMORY_KEY))
          ?.value as UserMemoryValue | undefined)
      : undefined;
    const userMemoryContext = userMemory?.facts?.length
      ? userMemory.facts.join("; ")
      : "";

    // Only revise the rejected draft when this compose is for the same email.
    const previousDraft =
      state.lastRejectedDraft?.emailId === state.emailId
        ? state.lastRejectedDraft
        : undefined;

    const draft = await getPlainModelWithConfig(config)
      .withStructuredOutput(DraftSchema)
      .invoke(
        draftPrompt({
          email,
          kbContext: state.kbContext,
          senderContext,
          userMemoryContext,
          revisionNotes: collectRevisionNotes(state.messages, state.emailId),
          previousDraft,
        }),
        hidden(config),
      );

    return { draft, senderContext };
  },
);
