import { OPENAI_API_KEY_HEADER } from "@repo/constants";
import type { ChatSuggestion } from "@/types";
import { apiClient } from "./client";

const SUGGESTIONS_PATH = "/api/suggestions";

// Self-managed replacement for CopilotKit's dynamic suggestions, whose forced tool call leaves
// the generation run open against this graph and never resolves. No model header: the route runs
// a fixed cheap model, not the teacher's chat pick.
export const generateSuggestions = async (
  transcript: string,
  count: number,
  apiKey?: string | null,
): Promise<ChatSuggestion[]> =>
  (
    await apiClient.post<{ suggestions: ChatSuggestion[] }>(
      SUGGESTIONS_PATH,
      { transcript, count },
      {
        headers: apiKey ? { [OPENAI_API_KEY_HEADER]: apiKey } : undefined,
      },
    )
  ).data.suggestions;
