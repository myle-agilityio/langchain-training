import { ChatOpenAI } from "@langchain/openai";

// Evals run outside a LangGraphRunnableConfig, so they build a plain model straight from
// OPENAI_API_KEY instead of config/model.ts's BYOK/header routing.
export const EVAL_MODEL = process.env.EVAL_MODEL ?? "gpt-4o-mini";

export const evalModel = (): ChatOpenAI =>
  new ChatOpenAI({ model: EVAL_MODEL, apiKey: process.env.OPENAI_API_KEY });
