import { tool } from "@langchain/core/tools";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { z } from "zod";

// Tool 1: Search AI news via Google News RSS
const searchAINews = tool(
  async ({ query, maxResults }: { query: string; maxResults: number }, config: LangGraphRunnableConfig): Promise<string> => {
    config.writer?.(`Searching AI news for: "${query}"...`);

    const encodedQuery = encodeURIComponent(`${query} artificial intelligence`);
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      const resp = await fetch(rssUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ai-news-agent/1.0)" },
        signal: controller.signal,
      });

      if (!resp.ok) return `Search failed: HTTP ${resp.status}`;

      const xml = await resp.text();

      // Parse <item> blocks from RSS XML
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
        .slice(0, maxResults)
        .map((m) => {
          const get = (tag: string) =>
            m[1].match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
              ?.slice(1)
              .find(Boolean)
              ?.trim() ?? "";

          return {
            title: get("title"),
            link: get("link"),
            source: get("source"),
            pubDate: get("pubDate"),
          };
        });

      if (items.length === 0) return "No results found.";

      config.writer?.(`Found ${items.length} articles for "${query}"`);

      return items
        .map((item, i) =>
          `${i + 1}. **${item.title}**\n   Source: ${item.source || "Unknown"}\n   Date: ${item.pubDate}\n   URL: ${item.link}`,
        )
        .join("\n\n");
    } catch (e) {
      return `Search failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      clearTimeout(timeoutId);
    }
  },
  {
    name: "search_ai_news",
    description: "Search for recent AI news articles from Google News RSS.",
    schema: z.object({
      query: z.string().describe("Search keywords (e.g. 'LLM', 'GPT-5', 'robotics')"),
      maxResults: z.number().int().min(1).max(10).default(5).describe("Number of results to return"),
    }),
  },
);

// Tool 2: Fetch full article content from a URL
const fetchArticleContent = tool(
  async ({ url }: { url: string }, config: LangGraphRunnableConfig): Promise<string> => {
    config.writer?.(`Fetching article: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);

    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; ai-news-agent/1.0)" },
        signal: controller.signal,
      });

      if (!resp.ok) return `Fetch failed: HTTP ${resp.status} ${resp.statusText}`;

      const html = await resp.text();

      // Strip HTML tags and collapse whitespace for readability
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

      config.writer?.(`Article fetched (${text.length} chars)`);

      // Return up to ~4000 chars to stay within context limits
      return text.length > 4000 ? text.slice(0, 4000) + "\n\n[truncated...]" : text;
    } catch (e) {
      return `Fetch failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      clearTimeout(timeoutId);
    }
  },
  {
    name: "fetch_article_content",
    description: "Fetch and return the plain-text content of a news article URL.",
    schema: z.object({
      url: z.string().describe("The full URL of the article to fetch"),
    }),
  },
);

export { searchAINews, fetchArticleContent };
