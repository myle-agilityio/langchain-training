import { AIMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SUMMARIZE_THRESHOLD } from "@/constants";
import type { AgentStateShape } from "@/types";
import { afterModeration, moderator } from "../moderator";

const mocks = vi.hoisted(() => ({ getPlainModelWithConfig: vi.fn() }));

vi.mock("@/config", () => ({
  getPlainModelWithConfig: mocks.getPlainModelWithConfig,
}));

const config = { configurable: { thread_id: "t1" } };

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

const messagesOfLength = (length: number) =>
  Array.from({ length }, () => new AIMessage("hi"));

describe("moderator — before any model call", () => {
  it("passes a non-human last message through without ever asking the model", async () => {
    const state: AgentStateShape = { messages: [new AIMessage("ok")] };

    await expect(moderator(state, config)).resolves.toEqual({
      blocked: false,
    });
    expect(mocks.getPlainModelWithConfig).not.toHaveBeenCalled();
  });
});

describe("afterModeration", () => {
  it("ends the turn on a flagged message", () => {
    expect(afterModeration({ messages: [], blocked: true })).toBe(END);
  });

  it("goes straight to call_model while the thread is still short", () => {
    expect(afterModeration({ messages: [], blocked: false })).toBe(
      "call_model",
    );
    expect(
      afterModeration({
        messages: messagesOfLength(SUMMARIZE_THRESHOLD),
        blocked: false,
      }),
    ).toBe("call_model");
  });

  it("detours through summarize once the thread passes the threshold", () => {
    expect(
      afterModeration({
        messages: messagesOfLength(SUMMARIZE_THRESHOLD + 1),
        blocked: false,
      }),
    ).toBe("summarize");
  });
});
