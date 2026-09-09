import { ChatOpenAI } from "@langchain/openai";

// Evals run outside a LangGraphRunnableConfig, so they build a plain model straight from env
// instead of config/model.ts's BYOK/header routing — Groq's free tier, not OPENAI_API_KEY.
export const EVAL_MODEL = process.env.EVAL_MODEL ?? "llama-3.3-70b-versatile";

export const evalModel = (): ChatOpenAI =>
  new ChatOpenAI({
    model: EVAL_MODEL,
    apiKey: process.env.GROQ_API_KEY,
    configuration: { baseURL: "https://api.groq.com/openai/v1" },
  });
