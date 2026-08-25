import type pg from "pg";
import { z } from "zod";

import { AppError, ERROR_CODE } from "@/errors/index";

// Read at call time, not import time, so the dev server's env loading always wins.
const EnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "the inbox lives in Postgres — set it in apps/agent/.env"),
  OPENAI_API_KEY: z.string().optional(),
  // Cosine similarity (0-1) a KB match must clear to be used as grounding.
  // 0.65 default: on-topic matches land ~0.7-0.8, off-topic ~0.55-0.6 for this KB.
  RAG_SCORE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
});

type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

// Validated once, then reused. A bad env is a CONFIG_INVALID with the offending names in detail.
export const getEnv = (): Env => {
  if (cached) {
    return cached;
  }

  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const fields = parsed.error.issues.map(
      (i) => `${i.path.join(".")} (${i.message})`,
    );

    throw new AppError(ERROR_CODE.CONFIG_INVALID, {
      detail: `invalid environment: ${fields.join("; ")}`,
      cause: parsed.error,
    });
  }

  cached = parsed.data;

  return cached;
};

export const getDatabaseUrl = (): string => getEnv().DATABASE_URL;

export const getRagScoreThreshold = (): number => getEnv().RAG_SCORE_THRESHOLD;

// Strip sslmode/channel_binding and decide TLS explicitly (node-postgres will change how it reads sslmode).
export const getPgConnectionOptions = (): pg.PoolConfig => {
  const parsed = new URL(getDatabaseUrl());
  const sslmode = parsed.searchParams.get("sslmode");

  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");

  return {
    connectionString: parsed.toString(),
    ssl:
      sslmode && sslmode !== "disable"
        ? { rejectUnauthorized: false }
        : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
};
