import { type ErrorCode } from "@/errors/index";

export interface ToolError {
  code: ErrorCode;
  message: string;
  recovery?: string;
}

// The one shape every tool returns, so a card only ever has to branch on `ok`.
export type ToolEnvelope<T> =
  { ok: true; data: T } | { ok: false; error: ToolError };
