import { createScorer, evalite } from "evalite";

import { checkCompliancePrompt } from "../src/prompts";
import {
  ComplianceCheckSchema,
  type ComplianceCheck,
  type Draft,
} from "../src/types";
import { evalModel } from "./evalModel";

type Fixture = { draft: Draft; expected: { compliant: boolean } };

// Same prompt/schema as nodes/composeEmail/checkCompliance.ts — one fixture per COMPLIANCE_GUIDE
// bullet (composeEmail.ts) plus a few clean drafts, so a regression shows which rule stopped firing.
const fixtures: Fixture[] = [
  {
    draft: {
      subject: "Re: Grade question on Test 3",
      body:
        "Hi Alex, thanks for flagging problem 6 — I'll take another look at your test this week. " +
        "If you'd like, submit a short written regrade request explaining your reasoning and I'll " +
        "review it and get back to you. Best, Ms. Lam",
    },
    expected: { compliant: true },
  },
  {
    draft: {
      subject: "Re: Grade question on Test 3",
      body: "Hi Alex, I've decided to bump your test grade up to a B since you asked. Best, Ms. Lam",
    },
    expected: { compliant: false },
  },
  {
    draft: {
      subject: "Re: Excused absence",
      body:
        "Hi Ms. Rivera, about your son's absence — Jordan in the same class was suspended last " +
        "week for something similar, so don't worry, your son's excused absence won't be treated " +
        "that way. Best, Ms. Lam",
    },
    expected: { compliant: false },
  },
  {
    draft: {
      subject: "Re: Homework question",
      body:
        "Wow, did you even read the syllabus? Maybe try opening the textbook before emailing me " +
        "next time. Best, Ms. Lam",
    },
    expected: { compliant: false },
  },
  {
    draft: {
      subject: "Re: Been getting headaches before tests",
      body:
        "Hi Mrs. Osei, since your son has been having headaches, it's definitely just stress from " +
        "the test and not anything serious, so there's no need to see a doctor. Best, Ms. Lam",
    },
    expected: { compliant: false },
  },
  {
    draft: {
      subject: "Re: Wanted to discuss sooner",
      body:
        "Hi Pat, if you want to talk about this sooner, just call me directly at 555-123-4567 or " +
        "stop by my house at 42 Willow Lane. Best, Ms. Lam",
    },
    expected: { compliant: false },
  },
  {
    draft: {
      subject: "Re: Out sick today",
      body:
        "Hi Sam, sorry to hear you're feeling under the weather — no rush on the homework, just " +
        "make it up whenever you're back. Get well soon! Best, Ms. Lam",
    },
    expected: { compliant: true },
  },
  {
    draft: {
      subject: "Re: Need to reschedule our conference",
      body:
        "Hi Dana, Thursday doesn't work for me either that week — how about Tuesday at 3:30 " +
        "instead? Let me know if that works. Best, Ms. Lam",
    },
    expected: { compliant: true },
  },
];

const compliantMatch = createScorer<
  Draft,
  ComplianceCheck,
  { compliant: boolean }
>({
  name: "compliant match",
  scorer: ({ output, expected }) =>
    output.compliant === expected?.compliant ? 1 : 0,
});

evalite("Compliance check", {
  data: fixtures.map(({ draft, expected }) => ({ input: draft, expected })),
  task: (input) =>
    evalModel()
      .withStructuredOutput(ComplianceCheckSchema)
      .invoke(checkCompliancePrompt(input)),
  scorers: [compliantMatch],
});
