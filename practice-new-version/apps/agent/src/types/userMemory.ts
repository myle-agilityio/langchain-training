import { z } from "zod";

// Value stored in the BaseStore under userMemoryNamespace(userId)/USER_MEMORY_KEY — durable facts
// about the teacher that aren't tied to one contact or one email (those belong in
// ContactProfileValue instead).
export interface UserMemoryValue {
  facts: string[];
}

// The `memorize` node's structured output — new facts worth keeping, or an empty array when this
// turn had nothing durable to add.
export const MemoryExtractionSchema = z.object({
  facts: z.array(z.string()),
});
export type MemoryExtraction = z.infer<typeof MemoryExtractionSchema>;
