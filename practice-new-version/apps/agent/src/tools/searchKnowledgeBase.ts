import { z } from "zod";

import { TOOL } from "@/constants";
import { searchKnowledge } from "@/rag";
import { defineTool } from "./defineTool";

export const search_knowledge_base = defineTool({
  run: async ({ query }, config) => ({
    articles: await searchKnowledge(query, config),
  }),
  name: TOOL.SEARCH_KNOWLEDGE_BASE,
  description:
    "Semantic search over school policy and course curriculum notes (late-work and re-grade " +
    "policy, absence/makeup rules, grade weighting, calculator rules, and the common errors " +
    "in each Grade 11/12 unit). Deadlines, penalties and makeup rules are never safe to " +
    "invent — ground them here before answering a policy question, standalone or not; a " +
    "general 'how do we handle X' question is answered by searching, not by asking which " +
    "email it's about.",
  schema: z.object({ query: z.string() }),
});
