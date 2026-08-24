import type { ToolEnvelope } from "@/types";

// Tools stringify one envelope, but a run can still be cut short mid-stream — null means
// "nothing to show yet", not "failed".
export const parseToolResult = <T>(
  result: string | undefined,
): ToolEnvelope<T> | null => {
  if (!result) return null;
  try {
    const parsed = JSON.parse(result) as ToolEnvelope<T>;
    return typeof parsed?.ok === "boolean" ? parsed : null;
  } catch {
    return null;
  }
};
