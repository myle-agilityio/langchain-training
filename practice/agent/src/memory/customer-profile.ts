import { z } from "zod";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import type { BaseStore } from "@langchain/langgraph";

import { loadEmails } from "../tools/emails/store.js";

/**
 * Long-term memory: what we know about a *customer*, across every thread and every email.
 *
 * The distinction that makes this worth having next to memory/history.ts: short-term memory is
 * scoped to one conversation and dies with it, so anything learned while replying to a customer
 * in one thread is gone when you open the next one. A profile keyed by the customer's email
 * address outlives both the thread and the individual email — "she's on the Team plan", "we
 * already refunded INV-24326", "prefers short replies, no apologies" — which is exactly the
 * context that makes the *second* reply to someone better than the first.
 *
 * It lives in LangGraph's cross-thread `Store`, the same mechanism the shared inbox uses (see
 * tools/emails/store.ts), under its own namespace.
 */
const NAMESPACE = ["customer_profiles"];

/**
 * Facts are capped and FIFO-trimmed. A profile is a prompt ingredient, not an archive: it's
 * injected into every model call for that customer, so unbounded growth would quietly undo the
 * context savings from history.ts.
 */
const MAX_FACTS = 8;

export const CustomerProfileSchema = z.object({
  email: z.string(),
  name: z.string().optional(),
  /** How this customer likes to be written to, in the user's own words. */
  tone: z.string().optional(),
  /** Durable facts — plan, past resolutions, promises made. Newest last. */
  facts: z.array(z.string()).default(() => []),
  updatedAt: z.string(),
});

export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;

// Email addresses are the stable identity here (names get typed inconsistently, ids are
// per-email), so the key is the normalized address.
const keyFor = (email: string) => email.trim().toLowerCase();

export async function loadProfile(
  store: BaseStore | undefined,
  email: string,
): Promise<CustomerProfile | undefined> {
  if (!store || !email) return undefined;
  const item = await store.get(NAMESPACE, keyFor(email));
  if (!item) return undefined;
  const parsed = CustomerProfileSchema.safeParse(item.value);
  return parsed.success ? parsed.data : undefined;
}

/** Renders a profile as a system-prompt block. Empty when we know nothing about them yet. */
export function renderCustomerProfile(
  profile: CustomerProfile | undefined,
): string {
  if (!profile || (!profile.tone && profile.facts.length === 0)) return "";
  const lines = [
    "",
    `  What you already know about ${profile.name ?? profile.email} (remembered from earlier`,
    "  conversations — the user cannot see this, so don't recite it back unprompted):",
    ...profile.facts.map((fact) => `  - ${fact}`),
  ];
  if (profile.tone) {
    lines.push(
      `  - Reply style they expect: ${profile.tone}. Apply it to drafts for them without`,
      "    being asked again.",
    );
  }
  lines.push("");
  return lines.join("\n");
}

function requireStore(runtime: ToolRuntime): BaseStore {
  if (!runtime.store) {
    throw new Error("No store available on this run — cannot reach customer memory.");
  }
  return runtime.store as unknown as BaseStore;
}

/**
 * Writing is an explicit tool call rather than something inferred automatically after each
 * reply: the model is the only thing that can tell a durable fact ("on the Team plan", "asked
 * us to skip the apologies") from a passing detail of one email, and an automatic writer would
 * fill the profile with the latter. It also keeps the write visible in the transcript.
 */
export const remember_customer = tool(
  async (
    input: { emailId: string; facts?: string[]; tone?: string },
    runtime: ToolRuntime,
  ) => {
    const store = requireStore(runtime);

    // The customer's identity is resolved from the inbox, never taken from the model. Asked
    // for an address directly, it will confidently invent a plausible one (observed: it wrote
    // a profile under `lilla.douglas-fisher@example.com` for a customer whose real address is
    // `lilla_douglas-fisher@hotmail.com`), and since recall looks the profile up by the *real*
    // sender address, that write is unreachable forever — memory that silently never recalls.
    // Passing an email id matches how every other tool here addresses things.
    const source = (await loadEmails(store)).find((e) => e.id === input.emailId);
    if (!source) {
      return new ToolMessage({
        content: `No email with id ${input.emailId} — call get_emails first to find the customer's email.`,
        tool_call_id: runtime.toolCallId,
      });
    }
    const { email: address, name } = source.from;
    const existing = await loadProfile(store, address);

    const incoming = (input.facts ?? []).map((f) => f.trim()).filter(Boolean);
    // Dedupe case-insensitively so re-learning the same fact doesn't consume the cap.
    const merged: string[] = [];
    for (const fact of [...(existing?.facts ?? []), ...incoming]) {
      if (!merged.some((kept) => kept.toLowerCase() === fact.toLowerCase())) {
        merged.push(fact);
      }
    }

    const profile: CustomerProfile = {
      email: address,
      name: name ?? existing?.name,
      tone: input.tone ?? existing?.tone,
      facts: merged.slice(-MAX_FACTS),
      updatedAt: new Date().toISOString(),
    };
    await store.put(NAMESPACE, keyFor(address), profile);

    return new ToolMessage({
      content: `Remembered for ${name} (${address}): ${
        incoming.length ? `${incoming.length} fact(s)` : "no new facts"
      }${input.tone ? `, reply style "${input.tone}"` : ""}.`,
      tool_call_id: runtime.toolCallId,
    });
  },
  {
    name: "remember_customer",
    description:
      "Save something durable about a customer so it's available in future conversations: " +
      "their plan, an outcome already delivered (a refund issued, a bug filed), a promise " +
      "made, or how they want replies written. Identify them by the id of one of their " +
      "emails — never by typing an address yourself. Don't store one-off details of a single " +
      "message, and don't store anything the inbox already records (status, classification).",
    schema: z.object({
      emailId: z
        .string()
        .describe(
          "id of any email from this customer — the profile is keyed off that email's sender",
        ),
      facts: z
        .array(z.string())
        .optional()
        .describe("short standalone statements, each useful on its own months from now"),
      tone: z
        .string()
        .optional()
        .describe("how they want replies written, e.g. 'short, no apologies'"),
    }),
  },
);
