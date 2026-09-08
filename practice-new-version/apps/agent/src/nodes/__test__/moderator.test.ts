import { END } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";

import { afterModeration } from "../moderator";

describe("afterModeration", () => {
  it("ends the turn on a flagged message", () => {
    expect(afterModeration({ messages: [], blocked: true })).toBe(END);
  });

  it("carries on to the model when nothing was flagged", () => {
    expect(afterModeration({ messages: [], blocked: false })).toBe(
      "call_model",
    );
    expect(afterModeration({ messages: [] })).toBe("call_model");
  });
});
