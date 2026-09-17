import { z } from "zod";

import { contactProfileNamespace } from "@/constants";
import { TOOL } from "@repo/constants";
import { getUserIdFromConfig } from "@/config";
import { getMemoryStore, listEmails } from "@/db";
import { AppError, ERROR_CODE } from "@/errors";
import type { ContactProfileValue } from "@/types";
import { defineTool } from "./defineTool";

// Resolves sender against real inbox data (like classify_emails resolves ids) instead of trusting
// a model-guessed address — a wrong guess would silently file the memory where it's never found.
//
// Reads/writes the PostgresStore directly instead of config.store: this graph is served through
// the LangGraph Agent Server (see http/copilotkit.ts)
export const update_contact_profile = defineTool({
  run: async (input, config) => {
    const userId = getUserIdFromConfig(config);
    const matches = await listEmails({ sender: input.sender });
    const addresses = [...new Set(matches.map((e) => e.from.email))];

    // Not tied to one inbox sender — general knowledge about the teacher, not this tool's job.
    // The `memorize` node already checks every turn for durable facts and saves them on its own,
    // so this is a no-op, not a failure the model needs to retry or apologize for.
    //
    // userId is undefined only outside a real request (e.g. LangSmith Studio) — see
    // getUserIdFromConfig — where per-visitor contact profiles are simply skipped too.
    if (!userId || addresses.length === 0) {
      return { skipped: true } as const;
    }

    if (addresses.length > 1) {
      throw new AppError(ERROR_CODE.SENDER_AMBIGUOUS, {
        detail: `${addresses.length} senders match "${input.sender}"`,
      });
    }

    const email = addresses[0];
    const name = matches.find((e) => e.from.email === email)!.from.name;

    const namespace = contactProfileNamespace(userId);
    const store = await getMemoryStore();

    // Store.put replaces the whole value, so merge facts read-modify-write style.
    const existing = (await store.get(namespace, email))?.value as
      ContactProfileValue | undefined;
    const profile: ContactProfileValue = {
      name,
      tone: input.tone ?? existing?.tone ?? null,
      facts: [...new Set([...(existing?.facts ?? []), ...(input.facts ?? [])])],
    };

    await store.put(
      namespace,
      email,
      profile as unknown as Record<string, unknown>,
    );

    return { profile: { email, ...profile } };
  },
  name: TOOL.UPDATE_CONTACT_PROFILE,
  description:
    "Save or update durable, cross-conversation memory about one email sender — their " +
    "preferred reply tone, or standing facts (accommodations, class/period, recurring context) " +
    "worth recalling in any future thread. Call this whenever the teacher asks you to remember " +
    "something about a person, even offhand ('remember that', 'keep in mind', 'note that'). " +
    "facts are merged into what's already on file, not replaced — pass only the new fact(s), " +
    "not the full list. sender is whatever the teacher called them (name or address) — this " +
    "tool resolves it against the real inbox itself, so never guess or construct an address. " +
    "Not for facts about a single email — that belongs in the reply itself, not the profile. " +
    "Not for general facts about the teacher themself (not tied to one person) — those are " +
    "captured automatically, so don't call this tool for them.",
  schema: z.object({
    sender: z.string(),
    tone: z.string().optional(),
    facts: z.array(z.string()).optional(),
  }),
});
