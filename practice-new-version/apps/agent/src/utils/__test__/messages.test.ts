import {
  AIMessage,
  HumanMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { describe, expect, it } from "vitest";

import {
  collectRevisionNotes,
  findReplyCall,
  findUnansweredReplyCall,
} from "@/utils";

const replyCall = (callId: string, emailId: string): AIMessage =>
  new AIMessage({
    content: "",
    tool_calls: [{ id: callId, name: "reply_to_email", args: { id: emailId } }],
  });

const otherCall = (callId: string): AIMessage =>
  new AIMessage({
    content: "",
    tool_calls: [{ id: callId, name: "get_emails", args: {} }],
  });

const answer = (callId: string): ToolMessage =>
  new ToolMessage({ content: "ok", tool_call_id: callId });

describe("findReplyCall", () => {
  it("returns the most recent reply_to_email call", () => {
    const messages: BaseMessage[] = [
      replyCall("call_1", "e1"),
      new HumanMessage("try again"),
      replyCall("call_2", "e1"),
    ];

    expect(findReplyCall(messages)?.id).toBe("call_2");
  });

  it("ignores human and tool messages and other tools' calls", () => {
    const messages: BaseMessage[] = [
      replyCall("call_1", "e1"),
      otherCall("call_2"),
      answer("call_2"),
      new HumanMessage("thanks"),
    ];

    expect(findReplyCall(messages)?.id).toBe("call_1");
  });

  it("is undefined when nothing asked for a reply", () => {
    expect(findReplyCall([])).toBeUndefined();
    expect(findReplyCall([otherCall("call_1")])).toBeUndefined();
  });
});

describe("findUnansweredReplyCall", () => {
  it("returns the call while no ToolMessage answers it", () => {
    const messages: BaseMessage[] = [replyCall("call_1", "e1")];

    expect(findUnansweredReplyCall(messages)?.id).toBe("call_1");
  });

  it("is undefined once a ToolMessage answers that call id", () => {
    const messages: BaseMessage[] = [
      replyCall("call_1", "e1"),
      answer("call_1"),
    ];

    expect(findUnansweredReplyCall(messages)).toBeUndefined();
  });

  it("still returns the newest call when only the older one was answered", () => {
    const messages: BaseMessage[] = [
      replyCall("call_1", "e1"),
      answer("call_1"),
      replyCall("call_2", "e1"),
    ];

    expect(findUnansweredReplyCall(messages)?.id).toBe("call_2");
  });
});

describe("collectRevisionNotes", () => {
  it("takes every human message before the only call", () => {
    const messages: BaseMessage[] = [
      new HumanMessage("reply to Flo"),
      new HumanMessage("keep it short"),
      replyCall("call_1", "e1"),
    ];

    expect(collectRevisionNotes(messages, "e1")).toBe(
      "reply to Flo\nkeep it short",
    );
  });

  it("takes only what was said since the previous call for that email", () => {
    const messages: BaseMessage[] = [
      new HumanMessage("reply to Flo"),
      replyCall("call_1", "e1"),
      answer("call_1"),
      new HumanMessage("try again, warmer"),
      replyCall("call_2", "e1"),
    ];

    expect(collectRevisionNotes(messages, "e1")).toBe("try again, warmer");
  });

  it("is scoped to one email id", () => {
    const messages: BaseMessage[] = [
      new HumanMessage("reply to Flo"),
      replyCall("call_1", "e1"),
    ];

    expect(collectRevisionNotes(messages, "e2")).toBe("");
  });

  it("is empty when no call for that email exists", () => {
    expect(collectRevisionNotes([], "e1")).toBe("");
  });
});

describe("edge cases with no tool_calls at all", () => {
  it("findReplyCall and findUnansweredReplyCall skip a message with no tool_calls array", () => {
    const bare = new AIMessage("just talking");

    expect(findReplyCall([bare])).toBeUndefined();
    expect(findUnansweredReplyCall([bare])).toBeUndefined();
  });

  it("collectRevisionNotes stringifies a non-string human message instead of dropping it", () => {
    const messages: BaseMessage[] = [
      new HumanMessage({ content: [{ type: "text", text: "reply to Flo" }] }),
      replyCall("call_1", "e1"),
    ];

    expect(collectRevisionNotes(messages, "e1")).toBe(
      JSON.stringify([{ type: "text", text: "reply to Flo" }]),
    );
  });
});
