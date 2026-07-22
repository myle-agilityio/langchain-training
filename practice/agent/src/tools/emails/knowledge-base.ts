/**
 * Mock knowledge base for `search_knowledge_base`.
 *
 * This is keyword/substring retrieval, not embedding-based search — a deliberate
 * "RAG-lite" scope call for the practice (see CLAUDE.md / the practice plan).
 * Articles are written to match the scenarios in seed-data.ts, so a search
 * triggered while triaging a seed email should actually find something relevant.
 *
 * Two kinds of article live here on purpose: school *policy* (what the teacher is
 * allowed to promise a parent) and *curriculum* notes (the math itself, so a reply
 * to a stuck student can be specific instead of "come see me at lunch").
 */

export interface KBArticle {
  id: string;
  title: string;
  tags: string[];
  content: string;
}

export const knowledgeBase: KBArticle[] = [
  // ── Policy ────────────────────────────────────────────────────────────────
  {
    id: "kb-late-work",
    title: "Late work and missed deadlines",
    tags: ["late", "deadline", "penalty", "homework", "project", "submission", "credit"],
    content:
      "Late assignments lose 10% per calendar day, to a floor of 50%, and are not accepted more than five school days past the due date. The penalty is waived for a documented absence, a technology outage reported before the deadline, or an extension agreed in advance — a student emailing the evening it was due does not qualify retroactively. Department policy is that the penalty applies to the assignment score, never to a student's participation or effort grade.",
  },
  {
    id: "kb-regrade-requests",
    title: "Re-grade and remark requests",
    tags: ["regrade", "remark", "dispute", "grade", "appeal", "test", "quiz", "marking"],
    content:
      "Re-grade requests must be made within five school days of work being returned, in writing, and must name specific questions rather than asking for a whole-paper review. Teachers re-mark the named questions only; a re-grade can lower a score as well as raise it, and students should be told this before it happens. An alternate valid method that reaches the correct answer earns full marks even if it differs from the method taught — that is a marking error, not a matter of discretion. Scores that remain disputed after a re-grade go to the department head, not back to the teacher a second time.",
  },
  {
    id: "kb-absence-makeup",
    title: "Absences and makeup work",
    tags: ["absence", "absent", "sick", "makeup", "missed", "excused", "trip"],
    content:
      "A student absent on the day of an assessment takes the makeup within three school days of returning, scheduled during the tutorial block or after school — not during another teacher's class. Absences must be reported to the attendance office by a parent; a note to the teacher alone doesn't excuse it. For planned absences (family travel, athletics), the teacher provides the upcoming unit's practice materials in advance, but assessments are still written on the scheduled date unless arranged with the grade-level office at least one week ahead.",
  },
  {
    id: "kb-makeup-exam-scheduling",
    title: "Scheduling and rescheduling makeup exams",
    tags: ["makeup", "exam", "reschedule", "scheduling", "conflict", "test", "clash"],
    content:
      "Makeup exams run in the tutorial block (Tue/Thu, 3:15–4:15) in Room 214. A booked makeup can be moved once, and only for a documented conflict with another scheduled school activity — a rescheduled lab, an athletics fixture, a counselling appointment. A student who misses a booked makeup without notice takes the alternate version, which is graded but capped at 90%. Always confirm a moved slot with the student in writing so there's a record of the new time.",
  },
  {
    id: "kb-parent-conferences",
    title: "Parent-teacher conferences and meeting requests",
    tags: ["conference", "meeting", "parent", "scheduling", "report card", "progress"],
    content:
      "Parent-teacher conferences are booked through the school's online scheduler, in 15-minute slots. Outside the formal conference window a teacher may offer any free period or after-school slot directly. For meetings about a disputed grade, department policy is to bring the marked work and the rubric, and to invite the department head if the parent has already escalated once. Do not discuss another student's grade or performance in a conference, even comparatively.",
  },
  {
    id: "kb-grading-weights",
    title: "Grade weighting and how the term mark is calculated",
    tags: ["grading", "weight", "rubric", "term", "mark", "score", "gradebook"],
    content:
      "Term marks weight assessments 50% (unit tests and the midterm), quizzes 20%, projects 20%, and homework/practice 10%. Homework is graded on completion rather than correctness — practice sets posted as optional extra work are never entered in the gradebook at all. The lowest single quiz score of the term is dropped automatically, which is often the answer to 'will this quiz ruin my grade'.",
  },
  {
    id: "kb-gradebook-deadlines",
    title: "Gradebook entry and reporting deadlines",
    tags: ["gradebook", "deadline", "admin", "midterm", "reporting", "department", "scores"],
    content:
      "All assessment scores must be entered in the gradebook system before the reporting deadline published by the department head each term; late entries block the whole department's report generation. Enter scores under the correct assessment category (see grade weighting) — miscategorised entries silently change the computed term mark. Comments are required for any student below 60% and for any incomplete.",
  },
  {
    id: "kb-calculator-policy",
    title: "Permitted calculators for tests and exams",
    tags: ["calculator", "exam", "test", "permitted", "graphing", "equipment", "final"],
    content:
      "Grade 11 and 12 assessments permit any non-CAS graphing calculator — the TI-84 Plus family and the Casio fx-9750 series are the models the department supports and can lend. CAS-capable models (TI-Nspire CAS, TI-89, Casio ClassPad) are not permitted on any assessment, since they return symbolic derivatives and integrals directly. Phones are never permitted as calculators. The department has a small loaner set; families should not feel obliged to buy one.",
  },
  {
    id: "kb-substitute-coverage",
    title: "Substitute coverage: pacing guides and seating charts",
    tags: ["substitute", "coverage", "pacing", "seating", "admin", "absent teacher"],
    content:
      "Teachers leave the current pacing guide, the seating chart, and a self-contained lesson in the shared department drive under Coverage/<course>/<term>. Substitutes should not introduce new content in Grade 12 calculus; the standing instruction is to run the posted practice set and collect it. Flag any student who was pulled out or arrived late on the coverage note so attendance can be reconciled.",
  },
  {
    id: "kb-academic-honesty",
    title: "Academic honesty on take-home work",
    tags: ["honesty", "cheating", "plagiarism", "project", "collaboration", "ai"],
    content:
      "Collaboration on practice sets is encouraged; projects and take-home assessments must be individual work, and students must show their own setup and reasoning, not just final answers. Identical wording or identical error patterns across submissions is the usual first signal. Suspected cases go to the grade-level office with the work attached — the teacher does not assign a zero unilaterally.",
  },

  // ── Curriculum ────────────────────────────────────────────────────────────
  {
    id: "kb-g11-logarithms",
    title: "Grade 11 unit: logarithms and exponential functions",
    tags: ["logarithm", "log", "exponential", "identity", "grade 11", "curriculum"],
    content:
      "Common sticking point: students apply the power rule before the product rule and lose a term. The order that works reliably is condense products/quotients first (log a + log b = log ab), then bring exponents down. The other recurring error is treating log(a + b) as log a + log b — worth naming explicitly, because students who make it will make it again on the test. Change-of-base is examinable: log_b(x) = ln x / ln b.",
  },
  {
    id: "kb-g11-rational-functions",
    title: "Grade 11 unit: polynomial and rational functions",
    tags: ["polynomial", "rational", "asymptote", "hole", "graph", "grade 11", "curriculum"],
    content:
      "A hole occurs where a factor cancels from numerator and denominator; a vertical asymptote occurs where a factor remains in the denominator only. Students who get 'a hole at x = -2' but a wrong-looking graph have usually found the hole correctly and then forgotten to check end behaviour: compare degrees for the horizontal asymptote (denominator higher → y = 0; equal → ratio of leading coefficients; numerator higher by one → slant asymptote via division).",
  },
  {
    id: "kb-g11-trig-identities",
    title: "Grade 11 unit: trigonometric identities",
    tags: ["trigonometry", "trig", "identity", "pythagorean", "grade 11", "curriculum"],
    content:
      "Proof strategy taught in class: work on the more complicated side only, convert everything to sine and cosine, and never operate across the equals sign. The Pythagorean identities and their rearrangements (sin²+cos²=1, 1+tan²=sec², 1+cot²=csc²) cover most of what's examinable. Students stuck at the first step are almost always trying to manipulate both sides at once.",
  },
  {
    id: "kb-g12-chain-rule",
    title: "Grade 12 unit: the chain rule",
    tags: ["chain rule", "derivative", "composite", "calculus", "grade 12", "curriculum"],
    content:
      "The failure mode is not the rule but the decomposition: students differentiate the outer function and stop, dropping the inner derivative. The class method is to write u = inner explicitly before differentiating, so dy/dx = dy/du · du/dx is mechanical. Nested compositions need the rule applied outward-in, once per layer; three-layer examples are examinable.",
  },
  {
    id: "kb-g12-related-rates",
    title: "Grade 12 unit: related rates",
    tags: ["related rates", "implicit", "derivative", "ladder", "calculus", "grade 12", "curriculum"],
    content:
      "Standard setup: write the geometric relation, differentiate implicitly with respect to time, and only then substitute the instantaneous values — substituting before differentiating is the single most common error, because it turns a variable into a constant and zeroes out its rate. The ladder problem (x² + y² = L²) is the canonical example; note that L is constant so it differentiates to zero, while x and y do not. Implicit differentiation followed by substitution is a valid alternate route to the same answer and earns full marks.",
  },
  {
    id: "kb-g12-optimization",
    title: "Grade 12 unit: optimization problems",
    tags: ["optimization", "maximum", "minimum", "constraint", "calculus", "grade 12", "curriculum", "project"],
    content:
      "Marks are allocated to the setup as much as the calculus: define the variable, write the objective function, use the constraint to reduce it to one variable, then differentiate. Students who set up the cylinder/box problems correctly but lose marks have usually skipped justifying that a critical point is a maximum — the first- or second-derivative test is required, not optional. Endpoints must be checked on a closed interval.",
  },
  {
    id: "kb-g12-definite-integrals",
    title: "Grade 12 unit: definite integrals and area under a curve",
    tags: ["integral", "area", "definite", "bounds", "sign", "calculus", "grade 12", "curriculum"],
    content:
      "Two recurring sign errors: forgetting that a curve below the x-axis contributes negative signed area (so 'area' questions need the integral split at the roots and the negative piece negated), and swapping the bounds when rewriting an integral, which flips the sign. Both are worth marking as method errors rather than arithmetic — students who fix them once rarely repeat them.",
  },
];

/** Keyword/substring search over the mock KB — no embeddings, see file header. */
export function searchKnowledgeBase(query: string, limit = 3): KBArticle[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return [];

  const scored = knowledgeBase.map((article) => {
    const haystack = [
      article.title,
      ...article.tags,
      article.content,
    ]
      .join(" ")
      .toLowerCase();

    const score = terms.reduce(
      (sum, term) => sum + (haystack.includes(term) ? 1 : 0),
      0,
    );
    return { article, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.article);
}
