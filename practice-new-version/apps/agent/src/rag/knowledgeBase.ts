import type { KBArticle } from "@/types";

// Seed articles for the pgvector knowledge base. Runtime search hits Postgres, not this array;
// this file only exists to (re)seed it — see rag/index.ts ensureIndexed.

export const knowledgeBase: KBArticle[] = [
  // ── Curriculum ────────────────────────────────────────────────────────────
  // All Policy entries now live in rag/sampleDocs/ (PDF + DOCX) instead of here.
  {
    id: "kb-g11-logarithms",
    title: "Grade 11 unit: logarithms and exponential functions",
    tags: [
      "logarithm",
      "log",
      "exponential",
      "identity",
      "grade 11",
      "curriculum",
    ],
    content:
      "Common sticking point: students apply the power rule before the product rule and lose a term. The order that works reliably is condense products/quotients first (log a + log b = log ab), then bring exponents down. The other recurring error is treating log(a + b) as log a + log b — worth naming explicitly, because students who make it will make it again on the test. Change-of-base is examinable: log_b(x) = ln x / ln b.",
  },
  {
    id: "kb-g11-rational-functions",
    title: "Grade 11 unit: polynomial and rational functions",
    tags: [
      "polynomial",
      "rational",
      "asymptote",
      "hole",
      "graph",
      "grade 11",
      "curriculum",
    ],
    content:
      "A hole occurs where a factor cancels from numerator and denominator; a vertical asymptote occurs where a factor remains in the denominator only. Students who get 'a hole at x = -2' but a wrong-looking graph have usually found the hole correctly and then forgotten to check end behaviour: compare degrees for the horizontal asymptote (denominator higher → y = 0; equal → ratio of leading coefficients; numerator higher by one → slant asymptote via division).",
  },
  {
    id: "kb-g11-trig-identities",
    title: "Grade 11 unit: trigonometric identities",
    tags: [
      "trigonometry",
      "trig",
      "identity",
      "pythagorean",
      "grade 11",
      "curriculum",
    ],
    content:
      "Proof strategy taught in class: work on the more complicated side only, convert everything to sine and cosine, and never operate across the equals sign. The Pythagorean identities and their rearrangements (sin²+cos²=1, 1+tan²=sec², 1+cot²=csc²) cover most of what's examinable. Students stuck at the first step are almost always trying to manipulate both sides at once.",
  },
  {
    id: "kb-g12-chain-rule",
    title: "Grade 12 unit: the chain rule",
    tags: [
      "chain rule",
      "derivative",
      "composite",
      "calculus",
      "grade 12",
      "curriculum",
    ],
    content:
      "The failure mode is not the rule but the decomposition: students differentiate the outer function and stop, dropping the inner derivative. The class method is to write u = inner explicitly before differentiating, so dy/dx = dy/du · du/dx is mechanical. Nested compositions need the rule applied outward-in, once per layer; three-layer examples are examinable.",
  },
  {
    id: "kb-g12-related-rates",
    title: "Grade 12 unit: related rates",
    tags: [
      "related rates",
      "implicit",
      "derivative",
      "ladder",
      "calculus",
      "grade 12",
      "curriculum",
    ],
    content:
      "Standard setup: write the geometric relation, differentiate implicitly with respect to time, and only then substitute the instantaneous values — substituting before differentiating is the single most common error, because it turns a variable into a constant and zeroes out its rate. The ladder problem (x² + y² = L²) is the canonical example; note that L is constant so it differentiates to zero, while x and y do not. Implicit differentiation followed by substitution is a valid alternate route to the same answer and earns full marks.",
  },
  {
    id: "kb-g12-optimization",
    title: "Grade 12 unit: optimization problems",
    tags: [
      "optimization",
      "maximum",
      "minimum",
      "constraint",
      "calculus",
      "grade 12",
      "curriculum",
      "project",
    ],
    content:
      "Marks are allocated to the setup as much as the calculus: define the variable, write the objective function, use the constraint to reduce it to one variable, then differentiate. Students who set up the cylinder/box problems correctly but lose marks have usually skipped justifying that a critical point is a maximum — the first- or second-derivative test is required, not optional. Endpoints must be checked on a closed interval.",
  },
  {
    id: "kb-g12-definite-integrals",
    title: "Grade 12 unit: definite integrals and area under a curve",
    tags: [
      "integral",
      "area",
      "definite",
      "bounds",
      "sign",
      "calculus",
      "grade 12",
      "curriculum",
    ],
    content:
      "Two recurring sign errors: forgetting that a curve below the x-axis contributes negative signed area (so 'area' questions need the integral split at the roots and the negative piece negated), and swapping the bounds when rewriting an integral, which flips the sign. Both are worth marking as method errors rather than arithmetic — students who fix them once rarely repeat them.",
  },
];
