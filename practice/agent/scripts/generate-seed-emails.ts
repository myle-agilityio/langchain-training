/**
 * One-time (rerunnable) generator for the mock support inbox.
 *
 * Faker builds the structured "brief" for each email (customer, reference
 * numbers, dates, platform) so tests can assert on concrete fields; an LLM
 * then writes the actual subject/body prose so the classifier has genuinely
 * varied language to work against instead of templated text.
 *
 * Usage: npm run generate:seed   (run from agent/)
 * Output: overwrites src/tools/emails/seed-data.ts
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { faker } from "@faker-js/faker";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

import {
  EmailSchema,
  type Email,
  type EmailCategory,
  type Urgency,
} from "../src/tools/emails/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.resolve(__dirname, "../../.env"));
} catch {
  // Fall back to whatever is already in the environment.
}

const PRODUCT_NAME = "Vela";
const PRODUCT_BLURB =
  "Vela is a project notes & docs collaboration app (shared workspaces, real-time docs, task boards).";

faker.seed(20260715); // fixed seed: reruns keep the same structural fields

interface ScenarioSpec {
  category: EmailCategory;
  urgency: Urgency;
  scenario: string; // may contain {product} / {platform} / {ref} placeholders
  preClassified: boolean; // seed a couple as already triaged, for shared-state variety
}

interface Brief extends ScenarioSpec {
  customerName: string;
  customerEmail: string;
  ref: string;
  platform: string;
  daysAgo: number;
}

const PLATFORMS = [
  "macOS app",
  "Windows app",
  "iOS app",
  "Android app",
  "web app",
];

const SCENARIOS: ScenarioSpec[] = [
  // question
  {
    category: "question",
    urgency: "low",
    scenario: "wants to know how to move a workspace to a different team plan",
    preClassified: false,
  },
  {
    category: "question",
    urgency: "low",
    scenario: "asking whether {product} supports exporting a doc to Markdown",
    preClassified: true,
  },
  {
    category: "question",
    urgency: "medium",
    scenario: "new admin wants to know how to bulk-invite 40 teammates before a Monday kickoff",
    preClassified: false,
  },
  // bug
  {
    category: "bug",
    urgency: "high",
    scenario: "the {platform} keeps losing unsaved edits after the laptop wakes from sleep",
    preClassified: false,
  },
  {
    category: "bug",
    urgency: "medium",
    scenario: "the task board's drag-and-drop randomly duplicates cards",
    preClassified: false,
  },
  {
    category: "bug",
    urgency: "high",
    scenario: "real-time doc sync shows a stale version after two teammates edit at the same time",
    preClassified: true,
  },
  {
    category: "bug",
    urgency: "low",
    scenario: "dark mode has a rendering glitch on the settings page",
    preClassified: false,
  },
  // billing
  {
    category: "billing",
    urgency: "high",
    scenario: "was charged twice for the Team plan renewal, invoice ref {ref}",
    preClassified: false,
  },
  {
    category: "billing",
    urgency: "medium",
    scenario: "downgraded plans mid-cycle but was still billed the full price",
    preClassified: false,
  },
  {
    category: "billing",
    urgency: "low",
    scenario: "needs a VAT number added to past invoices for their accounting team",
    preClassified: false,
  },
  // feature
  {
    category: "feature",
    urgency: "low",
    scenario: "requesting a keyboard shortcut to jump between workspaces",
    preClassified: false,
  },
  {
    category: "feature",
    urgency: "low",
    scenario: "wants an offline mode for the {platform}",
    preClassified: false,
  },
  // complex / ambiguous — deliberately hard to bucket into one category
  {
    category: "complex",
    urgency: "high",
    scenario:
      "reports losing content on a shared doc, unsure if it's a sync bug or a plan storage limit, and also wants a refund for the affected month",
    preClassified: false,
  },
  {
    category: "complex",
    urgency: "medium",
    scenario:
      "a long, rambling email mixing a minor UI complaint, a question about SSO support, and a request to speak with a manager",
    preClassified: false,
  },
];

function makeCustomer() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    customerName: `${firstName} ${lastName}`,
    customerEmail: faker.internet.email({ firstName, lastName }).toLowerCase(),
  };
}

function buildBrief(spec: ScenarioSpec): Brief {
  const { customerName, customerEmail } = makeCustomer();
  const platform = faker.helpers.arrayElement(PLATFORMS);
  const ref = `INV-${faker.number.int({ min: 10000, max: 99999 })}`;
  const scenario = spec.scenario
    .split("{product}").join(PRODUCT_NAME)
    .split("{platform}").join(platform)
    .split("{ref}").join(ref);

  return {
    ...spec,
    scenario,
    customerName,
    customerEmail,
    ref,
    platform,
    daysAgo: faker.number.int({ min: 0, max: 6 }),
  };
}

const EmailDraftSchema = z.object({
  subject: z.string().describe("Email subject line, written by the customer"),
  body: z
    .string()
    .describe(
      "Full email body, written by the customer in first person. No required greeting or sign-off — vary tone and length naturally.",
    ),
});

const model = new ChatOpenAI({ model: "gpt-5.4" }).withStructuredOutput(
  EmailDraftSchema,
);

async function writeEmailBody(brief: Brief) {
  const prompt = `You are generating one realistic customer support email for a test fixture set.

    Product: ${PRODUCT_NAME} — ${PRODUCT_BLURB}
    Customer: ${brief.customerName}
    Situation: ${brief.scenario}
    Customer's own perceived urgency (do not state this explicitly in the email): ${brief.urgency}

    Write the subject and body as the customer would actually write it. Vary tone and
    formality naturally across different emails — some terse, some polite, some frustrated,
    some rambling — so the set doesn't read as templated. Reference concrete details (dates,
    plan names, feature names) instead of vague language. Do not mention the category or
    urgency label. Keep the body under ~120 words.`;

  return model.invoke(prompt);
}

async function main() {
  const briefs = SCENARIOS.map(buildBrief);
  const emails: Email[] = [];

  for (const brief of briefs) {
    const draft = await writeEmailBody(brief);
    const receivedAt = new Date(
      Date.now() -
        brief.daysAgo * 24 * 60 * 60 * 1000 -
        faker.number.int({ min: 0, max: 82_800 }) * 1000,
    ).toISOString();

    emails.push({
      id: randomUUID(),
      from: { name: brief.customerName, email: brief.customerEmail },
      subject: draft.subject,
      body: draft.body,
      receivedAt,
      status: brief.preClassified ? "read" : "unread",
      classification: brief.preClassified
        ? { category: brief.category, urgency: brief.urgency }
        : undefined,
    });
    process.stdout.write(".");
  }
  process.stdout.write("\n");

  emails.sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );

  // Validate before writing — fail loudly rather than shipping bad fixtures.
  const validated = z.array(EmailSchema).parse(emails);

  const outPath = path.resolve(__dirname, "../src/tools/emails/seed-data.ts");
  const fileContents = `// Generated by \`npm run generate:seed\` (agent/scripts/generate-seed-emails.ts).
// Faker seed is fixed for reproducible structure; LLM prose varies between runs.
// Safe to hand-edit afterward — regenerating will overwrite this file.
import type { Email } from "./schema.js";

export const seedEmails: Email[] = ${JSON.stringify(validated, null, 2)};
`;

  writeFileSync(outPath, fileContents, "utf8");
  console.log(`Wrote ${validated.length} seed emails to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
