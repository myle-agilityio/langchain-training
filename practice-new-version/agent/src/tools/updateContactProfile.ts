import { tool } from "@langchain/core/tools";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";

import { CONTACT_PROFILE_NAMESPACE, TOOL } from "@/constants/index";
import { listEmails } from "@/db/index";
import type { ContactProfileValue } from "@/types/index";

// Resolves sender against real inbox data (like classify_emails resolves ids) instead of trusting
// a model-guessed address — a wrong guess would silently file the memory where it's never found.
export const update_contact_profile = tool(
  async (
    input: { sender: string; tone?: string; facts?: string[] },
    config: LangGraphRunnableConfig,
  ) => {
    const matches = await listEmails({ sender: input.sender });
    const addresses = [...new Set(matches.map((e) => e.from.email))];
    if (addresses.length === 0) {
      return JSON.stringify({
        ok: false,
        error: "no sender matches",
        recovery:
          "Call get_emails to find the right name or address, then retry.",
      });
    }
    if (addresses.length > 1) {
      return JSON.stringify({
        ok: false,
        error: "ambiguous sender — more than one address matches",
        matches: matches.map((e) => ({
          name: e.from.name,
          email: e.from.email,
        })),
        recovery:
          "Retry with the exact name or address for the one the teacher means.",
      });
    }
    const email = addresses[0];
    const name = matches.find((e) => e.from.email === email)!.from.name;

    const store = config.store;
    if (!store)
      throw new Error(
        "BaseStore missing — graph must be compiled with a store.",
      );
    // Store.put replaces the whole value, so merge facts read-modify-write style.
    const existing = (await store.get(CONTACT_PROFILE_NAMESPACE, email))
      ?.value as ContactProfileValue | undefined;
    const profile: ContactProfileValue = {
      name,
      tone: input.tone ?? existing?.tone ?? null,
      facts: [...new Set([...(existing?.facts ?? []), ...(input.facts ?? [])])],
    };
    await store.put(CONTACT_PROFILE_NAMESPACE, email, profile);
    return JSON.stringify({ ok: true, profile: { email, ...profile } });
  },
  {
    name: TOOL.UPDATE_CONTACT_PROFILE,
    description:
      "Save or update durable, cross-conversation memory about one email sender — their " +
      "preferred reply tone, or standing facts (accommodations, class/period, recurring context) " +
      "worth recalling in any future thread. Call this whenever the teacher asks you to remember " +
      "something about a person, even offhand ('remember that', 'keep in mind', 'note that'). " +
      "facts are merged into what's already on file, not replaced — pass only the new fact(s), " +
      "not the full list. sender is whatever the teacher called them (name or address) — this " +
      "tool resolves it against the real inbox itself, so never guess or construct an address. " +
      "Not for facts about a single email — that belongs in the reply itself, not the profile.",
    schema: z.object({
      sender: z.string(),
      tone: z.string().optional(),
      facts: z.array(z.string()).optional(),
    }),
  },
);
