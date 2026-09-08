import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";

import { routeAfterModel } from "../callModel";
import { TOOL } from "@repo/constants";

const calling = (...names: string[]): AIMessage =>
  new AIMessage({
    content: "",
    tool_calls: names.map((name, i) => ({
      id: `call_${i}`,
      name,
      args: {},
    })),
  });

describe("routeAfterModel", () => {
  it("ends when the model answered in plain text", () => {
    expect(routeAfterModel({ messages: [calling()] })).toBe(END);
  });

  it("ends when the last message is not the model's", () => {
    expect(routeAfterModel({ messages: [new HumanMessage("hi")] })).toBe(END);
  });

  it("sends reply_to_email into the compose subgraph", () => {
    expect(routeAfterModel({ messages: [calling(TOOL.REPLY_TO_EMAIL)] })).toBe(
      "compose_email",
    );
  });

  it("sends a backend tool to the tool node", () => {
    expect(routeAfterModel({ messages: [calling(TOOL.GET_EMAILS)] })).toBe(
      "tools",
    );
    expect(
      routeAfterModel({ messages: [calling(TOOL.SEARCH_KNOWLEDGE_BASE)] }),
    ).toBe("tools");
  });

  it("ends on a frontend action, which the tool node cannot run", () => {
    expect(routeAfterModel({ messages: [calling("setThemeColor")] })).toBe(END);
  });

  it("prefers compose_email when the turn asks for both", () => {
    expect(
      routeAfterModel({
        messages: [calling(TOOL.GET_EMAILS, TOOL.REPLY_TO_EMAIL)],
      }),
    ).toBe("compose_email");
  });
});
