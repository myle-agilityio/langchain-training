import { Hono } from "hono";
import { z } from "zod";

import { getPlainModelWithApiKey } from "@/config";
import { SIDE_TASK_MODEL } from "@/constants";
import { OPENAI_API_KEY_HEADER } from "@repo/constants";
import { suggestionsPrompt } from "@/prompts";
import { validate } from "./middleware";
import { SuggestionsBodySchema, type SuggestionsBody } from "./schemas";
import type { AppEnv } from "./types";

// Structured output rather than a tool call on purpose: CopilotKit's own dynamic suggestions
// force a tool call the graph never answers, which leaves the run open and never resolves.
const SuggestionListSchema = z.object({
  suggestions: z.array(z.object({ title: z.string(), message: z.string() })),
});

export const suggestionsApp = new Hono<AppEnv>();

suggestionsApp.post("/", validate("json", SuggestionsBodySchema), async (c) => {
  const { transcript, count } = c.get("valid") as SuggestionsBody;
  // Visitor's own key (BYOK) first, same as threads.ts — process.env is the leftover fallback.
  const apiKey =
    c.req.header(OPENAI_API_KEY_HEADER) ?? process.env.OPENAI_API_KEY;
  const model = getPlainModelWithApiKey(apiKey, SIDE_TASK_MODEL);

  const { suggestions } = await model
    .withStructuredOutput(SuggestionListSchema)
    .invoke([
      { role: "system", content: suggestionsPrompt() },
      {
        role: "user",
        content: `Give exactly ${count} suggestions for this conversation:\n\n${transcript}`,
      },
    ]);

  return c.json({ suggestions: suggestions.slice(0, count) });
});
