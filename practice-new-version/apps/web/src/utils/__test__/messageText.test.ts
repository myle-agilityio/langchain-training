import { describe, expect, it } from "vitest";

import { messageText } from "@/utils";

const text = (value: string) => ({ type: "text", text: value });
const image = { type: "image", image: "data:image/png;base64,AAAA" };

describe("messageText — string content", () => {
  it("returns a plain string body as it is", () => {
    expect(messageText({ role: "user", content: "reply to Flo" })).toBe(
      "reply to Flo",
    );
  });

  it("keeps an empty string rather than treating it as missing", () => {
    expect(messageText({ content: "" })).toBe("");
  });
});

describe("messageText — parts array", () => {
  it("pulls the text out of a single-part body", () => {
    expect(messageText({ content: [text("reply to Flo")] })).toBe(
      "reply to Flo",
    );
  });

  it("finds the text part even when an attachment comes first", () => {
    expect(messageText({ content: [image, text("what is this?")] })).toBe(
      "what is this?",
    );
  });

  it("takes the first text part when there are several", () => {
    expect(messageText({ content: [text("first"), text("second")] })).toBe(
      "first",
    );
  });

  it("is undefined when the array carries no text part", () => {
    expect(messageText({ content: [image] })).toBeUndefined();
    expect(messageText({ content: [] })).toBeUndefined();
  });

  it("is undefined when the text part has no text of its own", () => {
    expect(messageText({ content: [{ type: "text" }] })).toBeUndefined();
  });

  it("steps over nulls and primitives in the array instead of throwing", () => {
    expect(() => messageText({ content: [null, "loose", 7] })).not.toThrow();
    expect(messageText({ content: [null, "loose", text("found")] })).toBe(
      "found",
    );
  });
});

describe("messageText — anything else", () => {
  it("is undefined for a message with no content", () => {
    expect(messageText({})).toBeUndefined();
    expect(
      messageText({ role: "assistant", content: undefined }),
    ).toBeUndefined();
  });

  it("is undefined for content that is neither a string nor an array", () => {
    expect(messageText({ content: null })).toBeUndefined();
    expect(messageText({ content: 42 })).toBeUndefined();
    expect(messageText({ content: { text: "nested" } })).toBeUndefined();
  });
});
