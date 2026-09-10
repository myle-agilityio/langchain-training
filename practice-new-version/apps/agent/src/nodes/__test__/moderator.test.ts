import { AIMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";

import { SUMMARIZE_THRESHOLD } from "@/constants";
import { afterModeration } from "../moderator";

const messagesOfLength = (length: number) =>
  Array.from({ length }, () => new AIMessage("hi"));

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
