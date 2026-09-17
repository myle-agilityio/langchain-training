import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, ERROR_CODE } from "@/errors";
import type { AgentStateShape } from "@/types";
import { memorize, memorizeErrorHandler } from "../memorize";

const mocks = vi.hoisted(() => ({
  getPlainModelWithConfig: vi.fn(),
  getUserIdFromConfig: vi.fn(),
  getMemoryStore: vi.fn(),
}));

vi.mock("@/config", () => ({
  getPlainModelWithConfig: mocks.getPlainModelWithConfig,
  getUserIdFromConfig: mocks.getUserIdFromConfig,
  hidden: (config: unknown) => config,
}));

vi.mock("@/db", () => ({ getMemoryStore: mocks.getMemoryStore }));

const config = { configurable: { thread_id: "t1" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("memorize — before any model call", () => {
  it("no-ops when no userId was forwarded, never touching the store", async () => {
    mocks.getUserIdFromConfig.mockReturnValue(undefined);

    const state: AgentStateShape = {
      messages: [new HumanMessage("hi"), new AIMessage("hello")],
    };

    await expect(memorize(state, config)).resolves.toEqual({});
    expect(mocks.getMemoryStore).not.toHaveBeenCalled();
  });

  it("no-ops when the turn has no HumanMessage to extract from", async () => {
    mocks.getUserIdFromConfig.mockReturnValue("user-1");

    const state: AgentStateShape = { messages: [new AIMessage("hello")] };

    await expect(memorize(state, config)).resolves.toEqual({});
    expect(mocks.getMemoryStore).not.toHaveBeenCalled();
  });
});

const failure = (error: unknown) => ({ error }) as never;

describe("memorizeErrorHandler", () => {
  it("ends the turn without surfacing an error to the teacher", () => {
    const command = memorizeErrorHandler(
      { messages: [] },
      failure(new AppError(ERROR_CODE.MODEL_TIMEOUT)),
    );

    expect(command.goto).toEqual([END]);
    expect(command.update).toEqual({});
  });
});
