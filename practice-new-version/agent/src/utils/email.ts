import { getEmail } from "@/db/index";
import type { Email } from "@/types/index";

// Nodes call db/rag functions directly, never tool.invoke() — a tool invoked inside a node emits
// AG-UI TOOL_CALL events with no toolCallId, which kills the client's event stream mid-run.
export async function fetchEmailById(id: string): Promise<Email | null> {
  return (await getEmail(id)) ?? null;
}
