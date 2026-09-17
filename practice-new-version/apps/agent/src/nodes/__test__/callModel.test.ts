import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";

import { recentMessages, routeAfterModel } from "../callModel";
import type { AgentStateShape } from "@/types";
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

describe("recentMessages", () => {
  it("slices from summarizedCount when the cut lands cleanly", () => {
    const state: AgentStateShape = {
      messages: [
        new HumanMessage("a"),
        new AIMessage("b"),
        new HumanMessage("c"),
      ],
      summarizedCount: 2,
    };

    expect(recentMessages(state).map((m) => m.content)).toEqual(["c"]);
  });

  it("drops a leading tool message orphaned by the summarize cutoff", () => {
    const state: AgentStateShape = {
      messages: [
        new HumanMessage("a"),
        calling(TOOL.GET_EMAILS),
        new ToolMessage({ content: "result", tool_call_id: "call_0" }),
        new AIMessage("done"),
      ],
      // Lands the cut right on the tool message answering call_0.
      summarizedCount: 2,
    };

    expect(recentMessages(state).map((m) => m.content)).toEqual(["done"]);
  });

  it("drops every leading orphan when parallel tool calls left several in a row", () => {
    const state: AgentStateShape = {
      messages: [
        new HumanMessage("a"),
        calling(TOOL.GET_EMAILS, TOOL.SEARCH_KNOWLEDGE_BASE),
        new ToolMessage({ content: "r1", tool_call_id: "call_0" }),
        new ToolMessage({ content: "r2", tool_call_id: "call_1" }),
        new AIMessage("done"),
      ],
      summarizedCount: 2,
    };

    expect(recentMessages(state).map((m) => m.content)).toEqual(["done"]);
  });
});
