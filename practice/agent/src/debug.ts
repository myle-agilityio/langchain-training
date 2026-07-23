import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Dev-only debug logging that stays OUT of the LangGraph dev terminal.
 *
 * `console.log` from a tool lands in the `langgraph dev` output, where turbo prefixes every
 * line and interleaves it with UI logs — unreadable for anything multi-line. This appends
 * pretty-printed, timestamped entries to agent/debug.log instead, which you tail in its own
 * terminal (`cd agent && tail -f debug.log`) for a clean, isolated stream.
 */

// Resolve relative to this file so the log always lands at agent/debug.log regardless of the
// process's cwd (the langgraph CLI and the seed script run from different directories).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.resolve(__dirname, "../debug.log");

export function debug(label: string, value?: unknown): void {
  const body =
    value === undefined
      ? ""
      : "\n" +
        (typeof value === "string" ? value : safeStringify(value));
  appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${label}${body}\n`);
}

// JSON.stringify throws on circular refs (LangChain message objects have them); fall back to
// a plain inspect-ish string rather than crashing the tool just because a log line failed.
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
