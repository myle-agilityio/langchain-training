import { StateSchema } from "@langchain/langgraph";
import { SupportStepSchema,
  WarrantyStatusSchema,
  IssueTypeSchema,
} from "./schemas.js";

// State for customer support workflow
export const SupportState = new StateSchema({
  currentStep: SupportStepSchema.optional(),
  warrantyStatus: WarrantyStatusSchema.optional(),
  issueType: IssueTypeSchema.optional(),
});
