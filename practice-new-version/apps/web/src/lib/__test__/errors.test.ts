import { CopilotKitCoreErrorCode } from "@copilotkit/react-core/v2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ERROR_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  messageForCode,
} from "@/constants";
import { ApiError, reportFailure, toApiError, toChatError } from "@/lib";
import { useToast } from "@/stores";
import { ERROR_CODE } from "@/types";

const toasts = () => useToast.getState().toasts;

beforeEach(() => {
  useToast.setState({ toasts: [] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("messageForCode", () => {
  it("has wording for every code the agent can send", () => {
    for (const code of Object.values(ERROR_CODE)) {
      expect(ERROR_MESSAGE[code]).toBeTruthy();
    }
  });

  it("falls back to the generic line for a code it does not know", () => {
    expect(messageForCode("SOMETHING_NEW")).toBe(GENERIC_ERROR_MESSAGE);
  });
});

describe("ApiError", () => {
  it("shows catalog wording, never the developer-facing message", () => {
    const error = new ApiError(
      ERROR_CODE.EMAIL_NOT_FOUND,
      "GET /api/emails failed (404)",
      404,
      "req-1",
    );

    expect(error.userMessage).toBe(ERROR_MESSAGE[ERROR_CODE.EMAIL_NOT_FOUND]);
    expect(error.userMessage).not.toContain("/api/emails");
    expect(error.message).toBe("GET /api/emails failed (404)");
    expect(error.status).toBe(404);
    expect(error.requestId).toBe("req-1");
  });

  it("shows the generic line for an unrecognised code", () => {
    expect(new ApiError("WAT", "detail").userMessage).toBe(
      GENERIC_ERROR_MESSAGE,
    );
  });
});

describe("toApiError", () => {
  it("hands an ApiError back untouched", () => {
    const original = new ApiError(ERROR_CODE.NETWORK, "offline");

    expect(toApiError(original)).toBe(original);
  });

  it("wraps a plain Error as INTERNAL, keeping its message as detail", () => {
    const wrapped = toApiError(new Error("boom"));

    expect(wrapped.code).toBe(ERROR_CODE.INTERNAL);
    expect(wrapped.message).toBe("boom");
  });

  it("stringifies a non-Error throw", () => {
    expect(toApiError("just a string").message).toBe("just a string");
  });
});

describe("toChatError", () => {
  const chatFailure = (code: CopilotKitCoreErrorCode, error: Error) =>
    toChatError({ code, error });

  it("treats a runtime it never reached as a network failure", () => {
    expect(
      chatFailure(
        CopilotKitCoreErrorCode.RUNTIME_INFO_FETCH_FAILED,
        new Error("nope"),
      ).code,
    ).toBe(ERROR_CODE.NETWORK);
    expect(
      chatFailure(
        CopilotKitCoreErrorCode.AGENT_CONNECT_FAILED,
        new Error("nope"),
      ).code,
    ).toBe(ERROR_CODE.NETWORK);
  });

  it("treats a rejected fetch as a network failure whatever the code says", () => {
    expect(
      chatFailure(
        CopilotKitCoreErrorCode.AGENT_RUN_FAILED,
        new TypeError("Failed to fetch"),
      ).code,
    ).toBe(ERROR_CODE.NETWORK);
  });

  it("treats anything else on a reachable runtime as internal", () => {
    expect(
      chatFailure(
        CopilotKitCoreErrorCode.AGENT_RUN_FAILED,
        new Error("bad chunk"),
      ).code,
    ).toBe(ERROR_CODE.INTERNAL);
  });

  it("keeps the code and the original message as detail for the log", () => {
    const error = chatFailure(
      CopilotKitCoreErrorCode.AGENT_RUN_FAILED,
      new Error("bad chunk"),
    );

    expect(error.message).toContain("bad chunk");
    expect(error.message).toContain(CopilotKitCoreErrorCode.AGENT_RUN_FAILED);
  });
});

describe("reportFailure", () => {
  it("logs the technical detail and toasts only the safe wording", () => {
    reportFailure(
      new ApiError(ERROR_CODE.RATE_LIMITED, "POST /api/threads failed (429)"),
      "saveThread",
    );

    const line = String(vi.mocked(console.error).mock.lastCall?.[0]);

    expect(line).toContain("saveThread");
    expect(line).toContain("POST /api/threads failed (429)");
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0].message).toBe(ERROR_MESSAGE[ERROR_CODE.RATE_LIMITED]);
  });

  it("still logs but shows nothing when the failure is a background one", () => {
    reportFailure(new Error("boom"), "useSyncThreads", true);

    expect(console.error).toHaveBeenCalled();
    expect(toasts()).toHaveLength(0);
  });
});
