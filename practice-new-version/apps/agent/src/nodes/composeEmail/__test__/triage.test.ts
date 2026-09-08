import { END } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";

import type { ComposeEmailStateShape } from "@/types";
import { afterTriage } from "../triage";

// Only emailId and needsResearch steer the route; the rest is the state shape's baseline.
const state = (
  overrides: Partial<ComposeEmailStateShape>,
): ComposeEmailStateShape => ({
  messages: [],
  emailId: "e1",
  needsResearch: false,
  kbContext: "",
  senderContext: "",
  lastRejectedDraft: null,
  ...overrides,
});

describe("afterTriage", () => {
  it("ends the subgraph when triage matched no email", () => {
    expect(afterTriage(state({ emailId: "", needsResearch: true }))).toBe(END);
  });

  it("researches first when the draft needs grounding", () => {
    expect(afterTriage(state({ needsResearch: true }))).toBe("research");
  });

  it("writes straight away when it does not", () => {
    expect(afterTriage(state({ needsResearch: false }))).toBe("write_draft");
  });
});
