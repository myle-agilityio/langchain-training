import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SUMMARIZE_TRIGGER_PENDING_USER_MESSAGES } from "@/constants";
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

const userMessagesOfLength = (length: number) =>
  Array.from({ length }, () => new HumanMessage("hi"));

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

  it("goes straight to call_model while pending user turns are still at the threshold", () => {
    expect(afterModeration({ messages: [], blocked: false })).toBe(
      "call_model",
    );
    expect(
      afterModeration({
        messages: userMessagesOfLength(SUMMARIZE_TRIGGER_PENDING_USER_MESSAGES),
        blocked: false,
      }),
    ).toBe("call_model");
  });

  it("detours through summarize once pending user turns pass the threshold", () => {
    expect(
      afterModeration({
        messages: userMessagesOfLength(
          SUMMARIZE_TRIGGER_PENDING_USER_MESSAGES + 1,
        ),
        blocked: false,
      }),
    ).toBe("summarize");
  });

  it("only counts user messages — AI/tool traffic in a turn doesn't add to the pending count", () => {
    const messages = [
      new AIMessage("scaffolding"),
      new AIMessage("more scaffolding"),
      ...userMessagesOfLength(SUMMARIZE_TRIGGER_PENDING_USER_MESSAGES + 1),
    ];

    expect(afterModeration({ messages, blocked: false })).toBe("summarize");
  });

  it("ignores user messages already folded into the summary via summarizedCount", () => {
    const messages = [
      new HumanMessage("already folded 1"),
      new HumanMessage("already folded 2"),
      ...userMessagesOfLength(SUMMARIZE_TRIGGER_PENDING_USER_MESSAGES),
    ];

    expect(
      afterModeration({ messages, summarizedCount: 2, blocked: false }),
    ).toBe("call_model");

    expect(
      afterModeration({
        messages: [...messages, new HumanMessage("one more")],
        summarizedCount: 2,
        blocked: false,
      }),
    ).toBe("summarize");
  });
});
