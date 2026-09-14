import { AIMessage } from "@langchain/core/messages";
import { END, type NodeError } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";

import { AppError, ERROR_CODE, ERRORS, GENERIC_MESSAGE } from "@/errors";
import { nodeErrorHandler } from "../errorHandler";

const failure = (error: unknown): NodeError => ({ error }) as NodeError;

const handle = (error: unknown) =>
  nodeErrorHandler({ messages: [] }, failure(error));

describe("nodeErrorHandler", () => {
  it("ends the run and clears the in-flight email", () => {
    const command = handle(new AppError(ERROR_CODE.EMAIL_NOT_FOUND));

    // Command normalizes a single goto into a list.
    expect(command.goto).toEqual([END]);
    expect(command.update).toMatchObject({ emailId: "" });
  });

  it("turns a known error into its chat notice", () => {
    const command = handle(new AppError(ERROR_CODE.MODEL_TIMEOUT));
    const [message] = (command.update as { messages: AIMessage[] }).messages;

    expect(AIMessage.isInstance(message)).toBe(true);
    expect(message.content).toBe(ERRORS[ERROR_CODE.MODEL_TIMEOUT].userMessage);
  });

  it("never lets an unexpected failure describe itself to the teacher", () => {
    const command = handle(new Error("pool exhausted at pg.js:41"));
    const [message] = (command.update as { messages: AIMessage[] }).messages;

    expect(message.content).toBe(GENERIC_MESSAGE);
    expect(message.content).not.toContain("pool exhausted");
  });
});
