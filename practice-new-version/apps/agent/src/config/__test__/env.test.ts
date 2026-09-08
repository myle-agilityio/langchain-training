import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODE } from "@/errors";

// getEnv caches after its first successful parse, so every case needs a fresh module registry.
const loadEnv = async (vars: Record<string, string | undefined>) => {
  vi.resetModules();

  for (const [name, value] of Object.entries(vars)) {
    vi.stubEnv(name, value);
  }

  return import("../env");
};

const valid = {
  DATABASE_URL: "postgresql://user:pw@host/main",
  RAG_SCORE_THRESHOLD: undefined,
};

const caught = (run: () => unknown): { code?: string; detail?: string } => {
  try {
    run();
  } catch (error) {
    return error as { code?: string; detail?: string };
  }

  throw new Error("expected a throw");
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getEnv", () => {
  it("names the offending variable when the database url is missing", async () => {
    const { getEnv } = await loadEnv({ DATABASE_URL: undefined });
    const error = caught(getEnv);

    expect(error.code).toBe(ERROR_CODE.CONFIG_INVALID);
    expect(error.detail).toContain("DATABASE_URL");
  });

  it("defaults the rag threshold when it is not set", async () => {
    const { getEnv } = await loadEnv(valid);

    expect(getEnv().RAG_SCORE_THRESHOLD).toBe(0.65);
  });

  it("coerces the rag threshold from its string env value", async () => {
    const { getEnv } = await loadEnv({ ...valid, RAG_SCORE_THRESHOLD: "0.8" });

    expect(getEnv().RAG_SCORE_THRESHOLD).toBe(0.8);
  });

  it("rejects a rag threshold outside the 0-1 similarity range", async () => {
    const { getEnv } = await loadEnv({ ...valid, RAG_SCORE_THRESHOLD: "1.5" });
    const error = caught(getEnv);

    expect(error.code).toBe(ERROR_CODE.CONFIG_INVALID);
    expect(error.detail).toContain("RAG_SCORE_THRESHOLD");
  });

  it("validates once and reuses the result", async () => {
    const { getEnv } = await loadEnv(valid);
    const first = getEnv();

    vi.stubEnv("DATABASE_URL", "postgresql://user:pw@elsewhere/other");

    expect(getEnv()).toBe(first);
    expect(getEnv().DATABASE_URL).toBe("postgresql://user:pw@host/main");
  });
});

describe("getPgConnectionOptions", () => {
  it("strips sslmode and channel_binding out of the connection string", async () => {
    const { getPgConnectionOptions } = await loadEnv({
      ...valid,
      DATABASE_URL:
        "postgresql://user:pw@host/main?sslmode=require&channel_binding=require&application_name=agent",
    });
    const options = getPgConnectionOptions();

    expect(options.connectionString).not.toContain("sslmode");
    expect(options.connectionString).not.toContain("channel_binding");
    expect(options.connectionString).toContain("application_name=agent");
  });

  it("turns TLS on for any sslmode other than disable", async () => {
    const { getPgConnectionOptions } = await loadEnv({
      ...valid,
      DATABASE_URL: "postgresql://user:pw@host/main?sslmode=require",
    });

    expect(getPgConnectionOptions().ssl).toEqual({ rejectUnauthorized: false });
  });

  it("leaves TLS off for sslmode=disable and when sslmode is absent", async () => {
    const disabled = await loadEnv({
      ...valid,
      DATABASE_URL: "postgresql://user:pw@host/main?sslmode=disable",
    });

    expect(disabled.getPgConnectionOptions().ssl).toBeUndefined();

    const none = await loadEnv({ ...valid });

    expect(none.getPgConnectionOptions().ssl).toBeUndefined();
  });

  it("carries the pool sizing the agent runs with", async () => {
    const { getPgConnectionOptions } = await loadEnv(valid);

    expect(getPgConnectionOptions()).toMatchObject({
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  });
});
