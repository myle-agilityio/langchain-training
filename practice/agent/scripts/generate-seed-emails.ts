/**
 * One-time (rerunnable) generator for the mock teacher inbox.
 *
 * Faker builds the structured "brief" for each email (sender, class period,
 * dates, unit) so tests can assert on concrete fields; an LLM then writes the
 * actual subject/body prose so the classifier has genuinely varied language to
 * work against instead of templated text.
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
  type Course,
  type Email,
  type EmailTopic,
  type Urgency,
  type WorkType,
} from "../src/tools/emails/schema.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.resolve(__dirname, "../../.env"));
} catch {
  // Fall back to whatever is already in the environment.
}

// The inbox owner. Senders address them by name, so this drives the greeting line.
const TEACHER_NAME = "Ms. Lam";
const TEACHER_BLURB =
  "a high school mathematics teacher who teaches Grade 11 math (algebra 2 / precalculus topics) and Grade 12 math (calculus).";

faker.seed(20260715); // fixed seed: reruns keep the same structural fields

// Who's writing shapes the prose more than the topic does — students write short
// and informal, parents write formal and often anxious, colleagues write in
// staffroom shorthand. Passed to the LLM so the fixture set doesn't read as one voice.
type SenderRole = "student" | "parent" | "colleague";

interface ScenarioSpec {
  topic: EmailTopic;
  course: Course;
  workType: WorkType;
  urgency: Urgency;
  senderRole: SenderRole;
  scenario: string; // may contain {teacher} / {unit} / {period} / {child} placeholders
  preClassified: boolean; // seed a couple as already triaged, for shared-state variety
}

interface Brief extends ScenarioSpec {
  senderName: string;
  senderEmail: string;
  childName: string;
  period: string;
  unit: string;
  daysAgo: number;
}

// Units are course-specific so a Grade 12 email never cites a Grade 11 topic —
// the classifier should be able to infer `course` from the math itself, not just
// from an explicit "Grade 12" mention in the text.
const UNITS: Record<Course, string[]> = {
  math_11: [
    "logarithms and exponential functions",
    "trigonometric identities",
    "polynomial and rational functions",
    "sequences and series",
    "conic sections",
  ],
  math_12: [
    "limits and continuity",
    "the chain rule",
    "related rates",
    "optimization problems",
    "definite integrals and area under a curve",
  ],
  none: ["the current unit"],
};

const SCENARIOS: ScenarioSpec[] = [
  // question
  {
    topic: "question",
    course: "math_11",
    workType: "homework",
    urgency: "low",
    senderRole: "student",
    scenario:
      "is stuck on question 6 of the {unit} homework and can't tell which identity to apply first",
    preClassified: false,
  },
  {
    topic: "question",
    course: "math_12",
    workType: "practice",
    urgency: "medium",
    senderRole: "student",
    scenario:
      "can't follow the worked example on {unit} in the practice set, and the unit test is in two days",
    preClassified: true,
  },
  {
    topic: "question",
    course: "math_12",
    workType: "none",
    urgency: "low",
    senderRole: "parent",
    scenario:
      "asks which graphing calculator models are permitted for the Grade 12 final exam before buying one for {child}",
    preClassified: false,
  },
  // submission
  {
    topic: "submission",
    course: "math_11",
    workType: "project",
    urgency: "medium",
    senderRole: "student",
    scenario:
      "is turning in the {unit} project one day late and explains why, asking whether the late penalty applies",
    preClassified: false,
  },
  {
    topic: "submission",
    course: "math_12",
    workType: "homework",
    urgency: "low",
    senderRole: "student",
    scenario:
      "is resubmitting corrected {unit} homework after fixing the sign errors marked on the first attempt",
    preClassified: false,
  },
  // review_request
  {
    topic: "review_request",
    course: "math_11",
    workType: "practice",
    urgency: "low",
    senderRole: "student",
    scenario:
      "asks {teacher} to look over their worked solutions to the extra {unit} practice set before the quiz",
    preClassified: false,
  },
  {
    topic: "review_request",
    course: "math_12",
    workType: "project",
    urgency: "medium",
    senderRole: "student",
    scenario:
      "asks for feedback on a draft of their {unit} project before the final version is due",
    preClassified: true,
  },
  // grade_dispute
  {
    topic: "grade_dispute",
    course: "math_11",
    workType: "test",
    urgency: "high",
    senderRole: "parent",
    scenario:
      "disputes {child}'s {unit} unit test score, asks for it to be re-graded, and mentions college applications are at stake",
    preClassified: false,
  },
  {
    topic: "grade_dispute",
    course: "math_12",
    workType: "quiz",
    urgency: "medium",
    senderRole: "student",
    scenario:
      "believes question 4 of the {unit} quiz was marked wrong even though their method reaches the same answer a different way",
    preClassified: false,
  },
  // absence
  {
    topic: "absence",
    course: "math_12",
    workType: "test",
    urgency: "high",
    senderRole: "student",
    scenario:
      "is home sick today and will miss the {unit} test this afternoon, asking how to arrange a makeup",
    preClassified: false,
  },
  {
    topic: "absence",
    course: "math_11",
    workType: "none",
    urgency: "medium",
    senderRole: "parent",
    scenario:
      "says {child} will be away for a family trip all of next week and asks what work to keep up with",
    preClassified: false,
  },
  // scheduling
  {
    topic: "scheduling",
    course: "math_11",
    workType: "none",
    urgency: "medium",
    senderRole: "parent",
    scenario:
      "requests a parent-teacher conference about {child}'s progress before report cards go out",
    preClassified: false,
  },
  {
    topic: "scheduling",
    course: "math_12",
    workType: "test",
    urgency: "high",
    senderRole: "student",
    scenario:
      "needs to move the makeup exam booked for tomorrow morning because it clashes with a rescheduled physics lab",
    preClassified: false,
  },
  // admin
  {
    topic: "admin",
    course: "math_12",
    workType: "none",
    urgency: "medium",
    senderRole: "colleague",
    scenario:
      "the department head needs Grade 12 midterm scores entered in the gradebook system by Friday for the reporting deadline",
    preClassified: true,
  },
  {
    topic: "admin",
    course: "math_11",
    workType: "none",
    urgency: "low",
    senderRole: "colleague",
    scenario:
      "a substitute teacher asks for the Grade 11 pacing guide and seating chart for {period} while covering the class",
    preClassified: false,
  },
  // complex / ambiguous — deliberately hard to bucket into one topic
  {
    topic: "complex",
    course: "math_12",
    workType: "test",
    urgency: "high",
    senderRole: "parent",
    scenario:
      "a long, rambling email: {child} was absent for the {unit} test, the parent also thinks an earlier quiz was graded unfairly, and they want to meet in person this week",
    preClassified: false,
  },
  {
    topic: "complex",
    course: "math_11",
    workType: "homework",
    urgency: "medium",
    senderRole: "student",
    scenario:
      "mixes a question about a {unit} homework problem, a heads-up that they'll be absent Friday, and a question about whether late homework still earns partial credit",
    preClassified: false,
  },
];

function makePerson() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

function buildBrief(spec: ScenarioSpec): Brief {
  const sender = makePerson();
  // Parents write about a child; students and colleagues write about themselves.
  // A parent's child shares their surname so the two names read as one family.
  const childName =
    spec.senderRole === "parent"
      ? `${faker.person.firstName()} ${sender.lastName}`
      : sender.fullName;

  // Students/parents get consumer mail domains; staff get the school domain, so
  // the sender's address is itself a weak signal the classifier can pick up on.
  const senderEmail =
    spec.senderRole === "colleague"
      ? `${sender.firstName}.${sender.lastName}@westbrookhigh.edu`.toLowerCase()
      : faker.internet
          .email({ firstName: sender.firstName, lastName: sender.lastName })
          .toLowerCase();

  const period = `Period ${faker.number.int({ min: 1, max: 7 })}`;
  const unit = faker.helpers.arrayElement(UNITS[spec.course]);
  const scenario = spec.scenario
    .split("{teacher}").join(TEACHER_NAME)
    .split("{unit}").join(unit)
    .split("{period}").join(period)
    .split("{child}").join(childName);

  return {
    ...spec,
    scenario,
    senderName: sender.fullName,
    senderEmail,
    childName,
    period,
    unit,
    daysAgo: faker.number.int({ min: 0, max: 6 }),
  };
}

const EmailDraftSchema = z.object({
  subject: z.string().describe("Email subject line, written by the sender"),
  body: z
    .string()
    .describe(
      "Full email body, written by the sender in first person. No required greeting or sign-off — vary tone and length naturally.",
    ),
});

const model = new ChatOpenAI({ model: "gpt-4o-mini" }).withStructuredOutput(
  EmailDraftSchema,
);

const ROLE_VOICE: Record<SenderRole, string> = {
  student:
    "a high school student — informal, often brief, sometimes anxious about grades or deadlines; may use lowercase and run-on sentences",
  parent:
    "a parent of a student — more formal, sometimes worried or pointed; refers to their child by name and signs off with their own",
  colleague:
    "a fellow teacher or school staff member — collegial staffroom shorthand, assumes shared context about the school calendar",
};

async function writeEmailBody(brief: Brief) {
  const prompt = `You are generating one realistic email in a high school math teacher's inbox, for a test fixture set.

    Recipient: ${TEACHER_NAME}, ${TEACHER_BLURB}
    Sender: ${brief.senderName}, ${ROLE_VOICE[brief.senderRole]}
    ${brief.senderRole === "parent" ? `Their child in the class: ${brief.childName}` : ""}
    Class: ${brief.course === "math_11" ? "Grade 11 math" : brief.course === "math_12" ? "Grade 12 math (calculus)" : "not class-specific"}, ${brief.period}
    Situation: ${brief.scenario}
    Sender's own perceived urgency (do not state this explicitly in the email): ${brief.urgency}

    Write the subject and body as that person would actually write it. Vary tone and
    formality naturally across different emails — some terse, some polite, some worried,
    some rambling — so the set doesn't read as templated. Reference concrete details
    (specific problem numbers, dates, unit names, actual math topics) instead of vague
    language. Do not mention the topic, course, work type, or urgency labels. Keep the
    body under ~120 words.`;

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
      from: { name: brief.senderName, email: brief.senderEmail },
      subject: draft.subject,
      body: draft.body,
      receivedAt,
      status: brief.preClassified ? "read" : "unread",
      classification: brief.preClassified
        ? {
            topic: brief.topic,
            course: brief.course,
            workType: brief.workType,
            urgency: brief.urgency,
          }
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
  const fileContents = `// Mock teacher inbox. Generated by \`npm run generate:seed\` (agent/scripts/generate-seed-emails.ts).
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
