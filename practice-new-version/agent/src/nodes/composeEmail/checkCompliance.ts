import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { getPlainModelForConfig } from "@/config/model";
import { checkCompliancePrompt } from "@/prompts/index";
import {
  ComplianceCheckSchema,
  type ComposeEmailStateShape,
} from "@/types/index";
import { hidden } from "./shared";

// Independent guardrail on every draft (tone, policy, PII) — advisory only, teacher decides.
export async function checkCompliance(
  state: ComposeEmailStateShape,
  config: LangGraphRunnableConfig,
) {
  const draft = state.draft!;
  const compliance = await getPlainModelForConfig(config)
    .withStructuredOutput(ComplianceCheckSchema)
    .invoke(checkCompliancePrompt(draft), hidden(config));
  return { compliance };
}
