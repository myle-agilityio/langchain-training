import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { END, type NodeError } from "@langchain/langgraph";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, ERROR_CODE, ERRORS, GENERIC_MESSAGE } from "@/errors";
import { TOOL } from "@repo/constants";
import { nodeErrorHandler } from "../errorHandler";

const replyCall = new AIMessage({
  content: "",
  tool_calls: [{ id: "call_1", name: TOOL.REPLY_TO_EMAIL, args: { id: "e1" } }],
});

const failure = (error: unknown): NodeError => ({ error }) as NodeError;

const handle = (messages: AIMessage[] | ToolMessage[], error: unknown) =>
  nodeErrorHandler("compose_email")({ messages }, failure(error));

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("nodeErrorHandler", () => {
  it("ends the run and clears the in-flight email", () => {
    const command = handle([], new AppError(ERROR_CODE.EMAIL_NOT_FOUND));

    // Command normalizes a single goto into a list.
    expect(command.goto).toEqual([END]);
    expect(command.update).toMatchObject({ emailId: "" });
  });

  it("answers a dangling reply_to_email so the next turn's history stays valid", () => {
    const command = handle([replyCall], new AppError(ERROR_CODE.MODEL_TIMEOUT));
    const [message] = (command.update as { messages: ToolMessage[] }).messages;

    expect(ToolMessage.isInstance(message)).toBe(true);
    expect(message.tool_call_id).toBe("call_1");
    expect(message.content).toContain(
      ERRORS[ERROR_CODE.MODEL_TIMEOUT].userMessage,
    );
    expect(message.content).toContain("one short line and stop");
  });

  it("falls back to a chat notice once that call has been answered", () => {
    const answered = new ToolMessage({ content: "ok", tool_call_id: "call_1" });
    const command = handle(
      [replyCall, answered] as never,
      new AppError(ERROR_CODE.EMAIL_NOT_FOUND),
    );
    const [message] = (command.update as { messages: AIMessage[] }).messages;

    expect(AIMessage.isInstance(message)).toBe(true);
    expect(message.content).toBe(
      ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].userMessage,
    );
  });

  it("never lets an unexpected failure describe itself to the teacher", () => {
    const command = handle(
      [replyCall],
      new Error("pool exhausted at pg.js:41"),
    );
    const [message] = (command.update as { messages: ToolMessage[] }).messages;

    expect(message.content).toContain(GENERIC_MESSAGE);
    expect(message.content).not.toContain("pool exhausted");
  });
});

describe("nodeErrorHandler — a call with no id", () => {
  it('falls back to "unknown" rather than sending an undefined tool_call_id', () => {
    const call = new AIMessage({
      content: "",
      tool_calls: [{ id: undefined, name: TOOL.REPLY_TO_EMAIL, args: {} }],
    });
    const command = handle([call], new AppError(ERROR_CODE.EMAIL_NOT_FOUND));
    const [message] = (command.update as { messages: ToolMessage[] }).messages;

    expect(message.tool_call_id).toBe("unknown");
  });
});
