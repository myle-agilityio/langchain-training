import {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { afterEach, describe, expect, it } from "vitest";

import { apiClient } from "../client";
import { ApiError } from "@/lib";
import { ERROR_CODE } from "@/types";

const original = apiClient.defaults.adapter;

// Fails every request at the transport layer, the way a real axios failure reaches the interceptor.
const failWith = (axiosCode: string, status?: number, data?: unknown): void => {
  apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const response =
      status === undefined
        ? undefined
        : ({
            data,
            status,
            statusText: "",
            headers: {},
            config,
          } as AxiosResponse);

    throw new AxiosError("transport failed", axiosCode, config, {}, response);
  };
};

const caught = async (): Promise<ApiError> => {
  try {
    await apiClient.get("/api/emails");
  } catch (error) {
    return error as ApiError;
  }

  throw new Error("expected a rejection");
};

afterEach(() => {
  apiClient.defaults.adapter = original;
});

describe("apiClient error interceptor", () => {
  it("classifies a request that never reached the agent as NETWORK", async () => {
    failWith("ERR_NETWORK");

    const error = await caught();

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe(ERROR_CODE.NETWORK);
    expect(error.status).toBeUndefined();
  });

  it("uses the code the agent sent in the body", async () => {
    failWith("ERR_BAD_REQUEST", 404, {
      error: { code: ERROR_CODE.EMAIL_NOT_FOUND, requestId: "req-7" },
    });

    const error = await caught();

    expect(error.code).toBe(ERROR_CODE.EMAIL_NOT_FOUND);
    expect(error.status).toBe(404);
    expect(error.requestId).toBe("req-7");
  });

  it("falls back to INTERNAL when a response carried no code", async () => {
    failWith("ERR_BAD_RESPONSE", 500, "<html>gateway</html>");

    const error = await caught();

    expect(error.code).toBe(ERROR_CODE.INTERNAL);
    expect(error.status).toBe(500);
  });

  it("builds a uniform developer-facing message", async () => {
    failWith("ERR_BAD_REQUEST", 404, {});
    expect((await caught()).message).toBe("GET /api/emails failed (404)");

    failWith("ERR_NETWORK");
    expect((await caught()).message).toBe(
      "GET /api/emails failed (ERR_NETWORK)",
    );
  });

  it("rethrows anything that is not an axios failure", async () => {
    apiClient.defaults.adapter = async () => {
      throw new RangeError("something else entirely");
    };

    await expect(apiClient.get("/api/emails")).rejects.toBeInstanceOf(
      RangeError,
    );
  });

  it("leaves a successful response alone", async () => {
    apiClient.defaults.adapter = async (config) => ({
      data: { emails: [] },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    });

    await expect(apiClient.get("/api/emails")).resolves.toMatchObject({
      data: { emails: [] },
    });
  });
});
