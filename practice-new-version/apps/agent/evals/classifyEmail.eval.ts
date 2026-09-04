import { createScorer, evalite } from "evalite";

import { classifyPrompt } from "../src/prompts";
import {
  ClassificationSchema,
  type Classification,
  type Email,
} from "../src/types";
import { evalModel } from "./evalModel";

type Fixture = { email: Email; expected: Classification };

const email = (partial: Omit<Email, "id" | "status">, id: string): Email => ({
  id,
  status: "unread",
  ...partial,
});

// Same classification the teacher's inbox actually shows — mirrors tools/classifyEmails.ts's
// prompt+schema pair so this eval catches prompt regressions before they hit the graph.
const fixtures: Fixture[] = [
  {
    email: email(
      {
        from: { name: "Maya Chen", email: "maya@example.com" },
        subject: "Related rates question",
        receivedAt: "2026-03-02T14:00:00Z",
        body: "I don't understand how to set up the related rates problem on tonight's homework, #4. Can you point me at the right formula?",
      },
      "1",
    ),
    expected: {
      topic: "question",
      course: "math_12",
      workType: "homework",
      urgency: "low",
    },
  },
  {
    email: email(
      {
        from: { name: "Jordan Lee", email: "jordan@example.com" },
        subject: "Can you check my quiz answers?",
        receivedAt: "2026-03-02T09:15:00Z",
        body: "I finished the logarithms quiz early and wanted to see if my work on problems 3 and 5 is right before I submit it.",
      },
      "2",
    ),
    expected: {
      topic: "review_request",
      course: "math_11",
      workType: "quiz",
      urgency: "medium",
    },
  },
  {
    email: email(
      {
        from: { name: "Pat Rivera", email: "pat@example.com" },
        subject: "Disagree with my son's test grade",
        receivedAt: "2026-03-01T18:30:00Z",
        body: "My son says problem 6 on the calculus test was graded wrong and it's dropping his average right before progress reports go out. Can we sort this today?",
      },
      "3",
    ),
    expected: {
      topic: "grade_dispute",
      course: "math_12",
      workType: "test",
      urgency: "high",
    },
  },
  {
    email: email(
      {
        from: { name: "Sam Osei", email: "sam@example.com" },
        subject: "Out sick today",
        receivedAt: "2026-03-03T07:45:00Z",
        body: "I have a fever and won't be in class today. Let me know what I missed whenever you get a chance.",
      },
      "4",
    ),
    expected: {
      topic: "absence",
      course: "none",
      workType: "none",
      urgency: "low",
    },
  },
  {
    email: email(
      {
        from: { name: "Front Office", email: "office@example.com" },
        subject: "Staff meeting reminder",
        receivedAt: "2026-03-02T08:00:00Z",
        body: "Reminder that the monthly staff meeting is this Friday at 3:30pm in the library.",
      },
      "5",
    ),
    expected: {
      topic: "admin",
      course: "none",
      workType: "none",
      urgency: "low",
    },
  },
  {
    email: email(
      {
        from: { name: "Nina Patel", email: "nina@example.com" },
        subject: "Missed the project deadline and my grade",
        receivedAt: "2026-03-01T20:00:00Z",
        body: "I was out with a family emergency last week, missed the algebra project deadline, and I think my grade got docked for it — can we also find a time to talk it through before Thursday?",
      },
      "6",
    ),
    expected: {
      topic: "complex",
      course: "math_11",
      workType: "project",
      urgency: "high",
    },
  },
  {
    email: email(
      {
        from: { name: "Theo Brooks", email: "theo@example.com" },
        subject: "Extra practice for factoring",
        receivedAt: "2026-03-02T16:20:00Z",
        body: "Is there any extra practice you'd recommend for factoring polynomials? No rush, just want more reps before the unit ends.",
      },
      "7",
    ),
    expected: {
      topic: "question",
      course: "math_11",
      workType: "practice",
      urgency: "low",
    },
  },
  {
    email: email(
      {
        from: { name: "Dana Ford", email: "dana@example.com" },
        subject: "Need to reschedule our conference",
        receivedAt: "2026-03-02T11:10:00Z",
        body: "Something came up at work and I can't make our parent-teacher conference slot on Thursday. Could we move it to another day next week?",
      },
      "8",
    ),
    expected: {
      topic: "scheduling",
      course: "none",
      workType: "none",
      urgency: "medium",
    },
  },
];

const fieldScorer = (field: keyof Classification) =>
  createScorer<Email, Classification, Classification>({
    name: `${field} match`,
    scorer: ({ output, expected }) =>
      output[field] === expected?.[field] ? 1 : 0,
  });

evalite("Email classification", {
  data: fixtures.map(({ email, expected }) => ({ input: email, expected })),
  task: (input) =>
    evalModel()
      .withStructuredOutput(ClassificationSchema)
      .invoke(classifyPrompt(input)),
  scorers: [
    fieldScorer("topic"),
    fieldScorer("course"),
    fieldScorer("workType"),
    fieldScorer("urgency"),
  ],
});
