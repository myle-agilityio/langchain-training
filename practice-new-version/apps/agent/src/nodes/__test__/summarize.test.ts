import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { type NodeError } from "@langchain/langgraph";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SUMMARIZE_BATCH_USER_MESSAGES } from "@/constants";
import { AppError, ERROR_CODE } from "@/errors";
import type { AgentStateShape } from "@/types";
import { summarizeConversation, summarizeErrorHandler } from "../summarize";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  getPlainModelWithConfig: vi.fn(),
}));

vi.mock("@/config", () => ({
  getPlainModelWithConfig: mocks.getPlainModelWithConfig,
  hidden: (config: unknown) => config,
}));

const config = { configurable: { thread_id: "t1" } };

// One turn = a question + its plain-text reply, 2 messages.
const turn = (n: number) => [new HumanMessage(`q${n}`), new AIMessage(`a${n}`)];
const turns = (count: number) =>
  Array.from({ length: count }, (_, i) => turn(i)).flat();

beforeEach(() => {
  mocks.getPlainModelWithConfig.mockReturnValue({ invoke: mocks.invoke });
});

describe("summarizeConversation", () => {
  it("folds exactly SUMMARIZE_BATCH_USER_MESSAGES oldest turns, leaving the rest for later", async () => {
    mocks.invoke.mockResolvedValue({ content: "condensed" });

    const state: AgentStateShape = { messages: turns(5) };

    const result = await summarizeConversation(state, config);

    expect(result).toEqual({
      summary: "condensed",
      summarizedCount: SUMMARIZE_BATCH_USER_MESSAGES * 2,
    });
  });

  it("resumes from summarizedCount instead of re-folding already-summarized turns", async () => {
    mocks.invoke.mockResolvedValue({ content: "second batch" });

    const state: AgentStateShape = {
      messages: turns(7),
      summarizedCount: SUMMARIZE_BATCH_USER_MESSAGES * 2,
      summary: "first batch",
    };

    const result = await summarizeConversation(state, config);

    expect(result).toEqual({
      summary: "second batch",
      summarizedCount: SUMMARIZE_BATCH_USER_MESSAGES * 4,
    });
    expect(mocks.invoke).toHaveBeenCalledWith(
      expect.stringContaining("first batch"),
      config,
    );
  });

  it("keeps a turn's tool call and result together instead of splitting them across the cut", async () => {
    mocks.invoke.mockResolvedValue({ content: "condensed" });

    const messages = [
      ...turn(1),
      new HumanMessage("q2"),
      new AIMessage({
        content: "",
        tool_calls: [{ id: "call_0", name: "get_emails", args: {} }],
      }),
      new ToolMessage({ content: "result", tool_call_id: "call_0" }),
      new AIMessage("a2"),
      ...turn(3),
      new HumanMessage("q4"),
      new AIMessage("a4"),
    ];

    const state: AgentStateShape = { messages };

    const result = await summarizeConversation(state, config);

    // Turns 1-3 folded (2 + 4 + 2 = 8 messages); turn 4 (the tool call's neighbor) stays recent.
    expect(result).toEqual({ summary: "condensed", summarizedCount: 8 });
  });

  it("folds everything pending when fewer than a full batch of turns remain", async () => {
    mocks.invoke.mockResolvedValue({ content: "condensed" });

    const state: AgentStateShape = {
      messages: turns(SUMMARIZE_BATCH_USER_MESSAGES - 1),
    };

    const result = await summarizeConversation(state, config);

    expect(result).toEqual({
      summary: "condensed",
      summarizedCount: state.messages.length,
    });
  });

  it("is a no-op when summarizedCount already covers every message", async () => {
    const messages = turns(SUMMARIZE_BATCH_USER_MESSAGES);
    const state: AgentStateShape = {
      messages,
      summarizedCount: messages.length,
    };

    const result = await summarizeConversation(state, config);

    expect(result).toEqual({ summarizedCount: messages.length });
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});

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
