import { z } from "zod";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";

import { findEmail } from "../tools/emails/store.js";
import { query } from "../db/index.js";

/**
 * Long-term memory: what we know about a *contact* — a student, a parent, or a colleague —
 * across every thread and every email.
 *
 * The distinction that makes this worth having next to memory/history.ts: short-term memory is
 * scoped to one conversation and dies with it, so anything learned while replying to a student
 * in one thread is gone when you open the next one. A profile keyed by the contact's email
 * address outlives both the thread and the individual email — "in Grade 12, Period 3", "already
 * granted a makeup for the related rates test", "her parent prefers a phone call over email" —
 * which is exactly the context that makes the *second* reply to someone better than the first.
 *
 * "Contact" rather than "student" because the sender often isn't the student: a parent writes
 * about their child, and a profile keyed off the parent's address is about the parent, with the
 * child as a remembered fact.
 *
 * It lives in Postgres, the same database as the inbox (see ../db/index.ts), in its own
 * `contact_profiles` table.
 */

/**
 * Facts are capped and FIFO-trimmed. A profile is a prompt ingredient, not an archive: it's
 * injected into every model call for that contact, so unbounded growth would quietly undo the
 * context savings from history.ts.
 */
const MAX_FACTS = 8;

export const ContactProfileSchema = z.object({
  email: z.string(),
  name: z.string().optional(),
  /** How this contact likes to be written to, in the user's own words. */
  tone: z.string().optional(),
  /** Durable facts — class/period, accommodations, past outcomes, promises made. Newest last. */
  facts: z.array(z.string()).default(() => []),
  updatedAt: z.string(),
});

export type ContactProfile = z.infer<typeof ContactProfileSchema>;

// Email addresses are the stable identity here (names get typed inconsistently, ids are
// per-email), so the key is the normalized address.
const keyFor = (email: string) => email.trim().toLowerCase();

interface ProfileRow {
  email: string;
  name: string | null;
  tone: string | null;
  facts: string[];
  updated_at: Date;
}

export async function loadProfile(
  email: string | undefined,
): Promise<ContactProfile | undefined> {
  if (!email) return undefined;
  const { rows } = await query<ProfileRow>(
    `SELECT email, name, tone, facts, updated_at FROM contact_profiles WHERE email = $1`,
    [keyFor(email)],
  );
  if (!rows[0]) return undefined;
  const parsed = ContactProfileSchema.safeParse({
    email: rows[0].email,
    name: rows[0].name ?? undefined,
    tone: rows[0].tone ?? undefined,
    facts: rows[0].facts,
    updatedAt: rows[0].updated_at.toISOString(),
  });
  return parsed.success ? parsed.data : undefined;
}

/** Renders a profile as a system-prompt block. Empty when we know nothing about them yet. */
export function renderContactProfile(
  profile: ContactProfile | undefined,
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

/**
 * Writing is an explicit tool call rather than something inferred automatically after each
 * reply: the model is the only thing that can tell a durable fact ("in Grade 12, Period 3",
 * "gets extended time on assessments") from a passing detail of one email, and an automatic
 * writer would fill the profile with the latter. It also keeps the write visible in the
 * transcript.
 */
export const remember_contact = tool(
  async (
    input: { emailId: string; facts?: string[]; tone?: string },
    runtime: ToolRuntime,
  ) => {
    // The contact's identity is resolved from the inbox, never taken from the model. Asked
    // for an address directly, it will confidently invent a plausible one (observed: it wrote
    // a profile under `lilla.douglas-fisher@example.com` for a sender whose real address is
    // `lilla_douglas-fisher@hotmail.com`), and since recall looks the profile up by the *real*
    // sender address, that write is unreachable forever — memory that silently never recalls.
    // Passing an email id matches how every other tool here addresses things.
    const source = await findEmail(input.emailId);
    if (!source) {
      return new ToolMessage({
        content: `No email with id ${input.emailId} — call get_emails first to find the contact's email.`,
        tool_call_id: runtime.toolCallId,
      });
    }
    const { email: address, name } = source.from;
    const existing = await loadProfile(address);

    const incoming = (input.facts ?? []).map((f) => f.trim()).filter(Boolean);
    // Dedupe case-insensitively so re-learning the same fact doesn't consume the cap.
    const merged: string[] = [];
    for (const fact of [...(existing?.facts ?? []), ...incoming]) {
      if (!merged.some((kept) => kept.toLowerCase() === fact.toLowerCase())) {
        merged.push(fact);
      }
    }

    const profile: ContactProfile = {
      email: address,
      name: name ?? existing?.name,
      tone: input.tone ?? existing?.tone,
      facts: merged.slice(-MAX_FACTS),
      updatedAt: new Date().toISOString(),
    };
    // Upsert on the address so re-remembering the same contact updates their row rather than
    // failing the primary key.
    await query(
      `INSERT INTO contact_profiles (email, name, tone, facts, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (email) DO UPDATE SET
         name       = EXCLUDED.name,
         tone       = EXCLUDED.tone,
         facts      = EXCLUDED.facts,
         updated_at = EXCLUDED.updated_at`,
      [
        keyFor(address),
        profile.name ?? null,
        profile.tone ?? null,
        JSON.stringify(profile.facts),
        profile.updatedAt,
      ],
    );

    return new ToolMessage({
      content: `Remembered for ${name} (${address}): ${
        incoming.length ? `${incoming.length} fact(s)` : "no new facts"
      }${input.tone ? `, reply style "${input.tone}"` : ""}.`,
      tool_call_id: runtime.toolCallId,
    });
  },
  {
    name: "remember_contact",
    description:
      "Save something durable about a student, parent, or colleague so it's available in " +
      "future conversations: which class/period they're in, an accommodation they have, an " +
      "outcome already delivered (a makeup granted, a re-grade done), a promise made, or how " +
      "they want replies written. Identify them by the id of one of their emails — never by " +
      "typing an address yourself. Don't store one-off details of a single message, and don't " +
      "store anything the inbox already records (status, classification).",
    schema: z.object({
      emailId: z
        .string()
        .describe(
          "id of any email from this contact — the profile is keyed off that email's sender",
        ),
      facts: z
        .array(z.string())
        .optional()
        .describe("short standalone statements, each useful on its own months from now"),
      tone: z
        .string()
        .optional()
        .describe("how they want replies written, e.g. 'formal, always cc the parent'"),
    }),
  },
);
