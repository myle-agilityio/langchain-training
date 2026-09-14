import { type NodeError } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";

import { AppError, ERROR_CODE } from "@/errors";
import { summarizeErrorHandler } from "../summarize";

const failure = (error: unknown): NodeError => ({ error }) as NodeError;

describe("summarizeErrorHandler", () => {
  it("skips straight to call_model instead of ending the run", () => {
    const command = summarizeErrorHandler(
      { messages: [] },
      failure(new AppError(ERROR_CODE.MODEL_TIMEOUT)),
    );

    expect(command.goto).toEqual(["call_model"]);
  });

  it("leaves the summary and messages untouched — call_model uses the old summary as-is", () => {
    const command = summarizeErrorHandler(
      { messages: [] },
      failure(new AppError(ERROR_CODE.MODEL_TIMEOUT)),
    );

    expect(command.update).toEqual({});
  });
});
