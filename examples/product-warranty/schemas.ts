import { z } from "zod";

// Define the possible workflow steps
const SupportStepSchema = z.enum([
  "warranty_collector",
  "issue_classifier",
  "resolution_specialist",
]);
const WarrantyStatusSchema = z.enum(["in_warranty", "out_of_warranty"]);
const IssueTypeSchema = z.enum(["hardware", "software"]);

export { SupportStepSchema, WarrantyStatusSchema, IssueTypeSchema };
