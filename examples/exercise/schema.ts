import { z } from "zod";

const NewsArticle = z.object({
  title: z.string().describe("Headline of the article"),
  source: z.string().describe("Publisher or news outlet"),
  url: z.string().describe("Link to the original article"),
  summary: z.string().describe("Two-sentence summary of the article"),
  importance: z.enum(["high", "medium", "low"]).describe("Estimated newsworthiness"),
});

const AgentOutput = z.object({
  overview: z.string().describe("One-paragraph overview of the current AI news landscape"),
  articles: z.array(NewsArticle).describe("Structured list of AI news articles"),
  topStory: z.string().describe("Title of the single most important story this week"),
});

type NewsArticle = z.infer<typeof NewsArticle>;
type AgentOutput = z.infer<typeof AgentOutput>;

export { NewsArticle, AgentOutput };
