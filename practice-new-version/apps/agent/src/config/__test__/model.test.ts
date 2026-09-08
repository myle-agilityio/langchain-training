import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ERROR_CODE } from "@/errors";
import {
  CHAT_MODEL_HEADER,
  DEFAULT_CHAT_MODEL_ID,
  OPENAI_API_KEY_HEADER,
} from "@repo/constants";
import {
  EMBEDDING_MODEL,
  getApiKeyFromConfig,
  getEmbeddingsWithApiKey,
  getModelWithConfig,
  getPlainModelWithApiKey,
  getPlainModelWithConfig,
} from "../model";

const withHeaders = (
  headers: Record<string, string>,
): LangGraphRunnableConfig =>
  ({
    configurable: { copilotkit_forwarded_headers: headers },
  }) as LangGraphRunnableConfig;

const keyed = (extra: Record<string, string> = {}) =>
  withHeaders({ [OPENAI_API_KEY_HEADER]: "sk-visitor", ...extra });

const codeOfThrow = (run: () => unknown): string | undefined => {
  try {
    run();
  } catch (error) {
    return (error as { code?: string }).code;
  }

  return undefined;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getApiKeyFromConfig", () => {
  it("prefers the visitor's forwarded key over the server's", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-server");

    expect(getApiKeyFromConfig(keyed())).toBe("sk-visitor");
  });

  it("matches the header name case-insensitively", () => {
    const config = withHeaders({ "X-OpenAI-API-Key": "sk-visitor" });

    expect(getApiKeyFromConfig(config)).toBe("sk-visitor");
  });

  it("falls back to the server key when no header is forwarded", () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-server");

    expect(getApiKeyFromConfig(withHeaders({}))).toBe("sk-server");
    expect(getApiKeyFromConfig({} as LangGraphRunnableConfig)).toBe(
      "sk-server",
    );
  });

  it("fails with API_KEY_MISSING when neither is set", () => {
    vi.stubEnv("OPENAI_API_KEY", undefined);

    expect(codeOfThrow(() => getApiKeyFromConfig(withHeaders({})))).toBe(
      ERROR_CODE.API_KEY_MISSING,
    );
  });
});

describe("getModelWithConfig — model pick", () => {
  it("honours a model id that is one of the offered options", () => {
    const model = getModelWithConfig(keyed({ [CHAT_MODEL_HEADER]: "gpt-4o" }));

    expect(model.model).toBe("gpt-4o");
  });

  it("falls back to the default when the header is absent", () => {
    expect(getModelWithConfig(keyed()).model).toBe(DEFAULT_CHAT_MODEL_ID);
  });

  it("ignores a model id that is not on the allowlist", () => {
    const model = getModelWithConfig(
      keyed({ [CHAT_MODEL_HEADER]: "gpt-9-turbo-unreleased" }),
    );

    expect(model.model).toBe(DEFAULT_CHAT_MODEL_ID);
  });
});

describe("model kwargs", () => {
  it("holds the chat turn to one tool call, which the router relies on", () => {
    expect(getModelWithConfig(keyed()).modelKwargs).toEqual({
      parallel_tool_calls: false,
    });
  });

  it("sends no tool kwargs on the plain model — withStructuredOutput 400s on them", () => {
    expect(getPlainModelWithConfig(keyed()).modelKwargs).not.toHaveProperty(
      "parallel_tool_calls",
    );
  });
});

describe("clients built from a raw key", () => {
  it("embeds with the fixed embedding model", () => {
    expect(getEmbeddingsWithApiKey("sk-visitor").model).toBe(EMBEDDING_MODEL);
  });

  it("passes the caller's model through for a fixed-model call", () => {
    expect(getPlainModelWithApiKey("sk-visitor", "gpt-4o-mini").model).toBe(
      "gpt-4o-mini",
    );
  });

  it("fails with API_KEY_MISSING when the header carried no key", () => {
    expect(codeOfThrow(() => getEmbeddingsWithApiKey(undefined))).toBe(
      ERROR_CODE.API_KEY_MISSING,
    );
    expect(
      codeOfThrow(() => getPlainModelWithApiKey(undefined, "gpt-4o")),
    ).toBe(ERROR_CODE.API_KEY_MISSING);
  });
});
