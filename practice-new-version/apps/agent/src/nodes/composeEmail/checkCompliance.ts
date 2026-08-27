import type { LangGraphRunnableConfig } from "@langchain/langgraph";

import { getPlainModelWithConfig, hidden } from "@/config";
import { checkCompliancePrompt } from "@/prompts";
import { ComplianceCheckSchema, type ComposeEmailStateShape } from "@/types";

// Independent guardrail on every draft (tone, policy, PII) — advisory only, teacher decides.
export const checkCompliance = async (
  state: ComposeEmailStateShape,
  config: LangGraphRunnableConfig,
) => {
  const draft = state.draft!;
  const compliance = await getPlainModelWithConfig(config)
    .withStructuredOutput(ComplianceCheckSchema)
    .invoke(checkCompliancePrompt(draft), hidden(config));

  return { compliance };
};
