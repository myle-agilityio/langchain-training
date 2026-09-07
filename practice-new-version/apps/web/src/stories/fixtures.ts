import type { ChatThread } from "@repo/types";
import type { Email, ToolError } from "@/types";

const hoursAgo = (hours: number): string =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

// Six emails covering every status and enough classifications for the badge rows to differ.
export const sampleEmails: Email[] = [
  {
    id: "1d4ff3e7-81b9-4d39-ad26-1e93e622d363",
    from: { name: "Angelina Connelly", email: "angelina.connelly@hotmail.com" },
    subject: "Question about #4 on the related rates quiz",
    body: "Hi Ms. Lam,\n\nI was looking over the quiz from Period 3 today and I think my work on question 4 might have been marked wrong even though I got the same final answer, just a different way.\n\nI used implicit differentiation starting from x^2 + y^2 = 100 and plugged in the values after, instead of the way from your notes.\n\nCould you take another look when you have a chance?\n\nThanks,\nAngelina",
    receivedAt: hoursAgo(2),
    status: "unread",
    classification: {
      topic: "grade_dispute",
      course: "math_12",
      workType: "quiz",
      urgency: "high",
    },
  },
  {
    id: "d01cce28-9812-444f-8f1d-9e47149547e1",
    from: { name: "Felix Gislason", email: "felix_gislason@hotmail.com" },
    subject: "late project from period 6",
    body: "Hi Ms. Lam,\n\nI just submitted my project on polynomial and rational functions in Google Classroom, but it's a day late. I know it was due Tuesday, so I get it if there's a late deduction, but I wanted to ask if the one-day late penalty still applies here.\n\nFelix",
    receivedAt: hoursAgo(9),
    status: "unread",
    classification: {
      topic: "submission",
      course: "math_11",
      workType: "project",
      urgency: "medium",
    },
  },
  {
    id: "d1ad1f6a-1312-4eaa-aedc-0d69be06426f",
    from: { name: "Flo Beahan", email: "flo.beahan93@hotmail.com" },
    subject: "Jewell Beahan — missed test Monday / grading question",
    body: "Ms. Lam,\n\nJewell was absent on Monday and missed the related rates test. I'd like to know when that will be made up.\n\nCould we meet in person sometime this week after school?\n\nFlo Beahan",
    receivedAt: hoursAgo(26),
    status: "flagged_for_followup",
    classification: {
      topic: "complex",
      course: "math_12",
      workType: "test",
      urgency: "high",
    },
  },
  {
    id: "aaead21e-1dcc-4905-a1fc-a5494b6dfb4b",
    from: { name: "Imani Dietrich", email: "imani_dietrich53@hotmail.com" },
    subject: "corrected 5.4 assignment",
    body: "Hi Ms. Lam,\n\nI'm resubmitting the 5.4 definite integrals worksheet from last Thursday. I fixed the sign errors you marked on #3, #7, and #9.\n\nThanks,\nImani",
    receivedAt: hoursAgo(50),
    status: "read",
    classification: {
      topic: "submission",
      course: "math_12",
      workType: "homework",
      urgency: "low",
    },
  },
  {
    id: "a30389ba-fb53-4308-984d-b922434a7f3a",
    from: { name: "Marcus Mohr", email: "marcus.mohr52@yahoo.com" },
    subject: "could you check my work on the extra practice?",
    body: "Hi Ms. Lam,\n\nI finished the extra practice set for polynomial + rational functions and wanted to ask if you could look it over before Friday's quiz. I'm mostly unsure about #7 and #12.\n\nThanks,\nMarcus",
    receivedAt: hoursAgo(74),
    status: "replied",
    classification: {
      topic: "review_request",
      course: "math_11",
      workType: "practice",
      urgency: "medium",
    },
    reply: {
      subject: "Re: could you check my work on the extra practice?",
      body: "Hi Marcus,\n\nHappy to look it over — bring the pages to Period 5 tomorrow and we'll go through #7 and #12 together.\n\nMs. Lam",
      sentAt: hoursAgo(70),
    },
  },
  {
    id: "1fb3a668-a0f9-4dc0-81a6-235c168cc1ab",
    from: { name: "Ezra Konopelski", email: "ezra_konopelski@yahoo.com" },
    subject: "Absent today / test this afternoon",
    body: "Hi Ms. Lam,\n\nI woke up feeling awful and my parents are keeping me home, so I'm going to miss Period 5 today, including the chain rule test.\n\nCould you let me know how I should set up a makeup?\n\nThanks,\nEzra",
    receivedAt: hoursAgo(100),
    status: "unread",
  },
];

export const sampleEmail = sampleEmails[0];
export const repliedEmail = sampleEmails[4];
export const unclassifiedEmail = sampleEmails[5];

export const sampleThreads: ChatThread[] = [
  {
    id: "8f0e2a41-1f2b-4a6d-9c22-0a6b6f0a1c11",
    title: "Triage this morning's inbox",
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(1),
  },
  {
    id: "3a5f5f5c-08b2-4f9a-9c0f-2b2a0e4d7c22",
    title: "Draft a reply to Felix about the late project",
    createdAt: hoursAgo(30),
    updatedAt: hoursAgo(28),
  },
  {
    id: "c2a7d4e9-5c31-4b8e-8a53-9f4c1d6b3e33",
    title: null,
    createdAt: hoursAgo(72),
    updatedAt: hoursAgo(72),
  },
];

export const sampleArticles = [
  {
    title: "Late work policy",
    content:
      "Work submitted after the due date loses 10% per calendar day, to a maximum of 30%. Anything more than three days late is capped at 50% unless an extension was arranged beforehand.",
  },
  {
    title: "Regrade requests",
    content:
      "Regrade requests are accepted within one week of the paper being handed back. Ask the student to write out which question they want re-checked and why before meeting.",
  },
];

// Every tool card reads one stringified envelope — these are the two shapes it can take.
export const toolResult = (data: unknown): string =>
  JSON.stringify({ ok: true, data });

export const toolFailure = (error: ToolError): string =>
  JSON.stringify({ ok: false, error });

export const sampleToolError: ToolError = {
  code: "EMAIL_NOT_FOUND",
  message: "no row for that id",
};
