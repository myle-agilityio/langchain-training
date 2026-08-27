import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { getEmbeddingsForConfig } from "@/config";
import { searchKnowledge } from "@/rag";
import type { ComposeEmailStateShape, KBArticle } from "@/types";
import { fetchEmailById } from "@/utils";

// research — search_knowledge_base for the policy the draft must not invent.
export const research = async (
  state: ComposeEmailStateShape,
  config: LangGraphRunnableConfig,
) => {
  const email = await fetchEmailById(state.emailId);

  if (!email) {
    return { kbContext: "" };
  }

  const query = `${email.subject} ${email.body} ${Object.values(email.classification ?? {}).join(" ")}`;
  const articles = (await searchKnowledge(
    query,
    getEmbeddingsForConfig(config),
  )) as KBArticle[];
  const kbContext = articles.length
    ? articles.map((a) => `## ${a.title}\n${a.content}`).join("\n\n")
    : "No relevant articles found. Do not state any policy you cannot ground here.";

  return { kbContext };
};
