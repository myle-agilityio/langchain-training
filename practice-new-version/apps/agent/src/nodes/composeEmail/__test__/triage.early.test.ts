import { AIMessage } from "@langchain/core/messages";
import { describe, expect, it, vi } from "vitest";

import { TOOL } from "@repo/constants";
import type { ComposeEmailStateShape } from "@/types";
import { triage } from "../triage";

const mocks = vi.hoisted(() => ({
  getPlainModelWithConfig: vi.fn(),
  fetchEmailById: vi.fn(),
}));

vi.mock("@/config", () => ({
  getPlainModelWithConfig: mocks.getPlainModelWithConfig,
  hidden: (c: unknown) => c,
}));

vi.mock("@/utils", () => ({
  fetchEmailById: mocks.fetchEmailById,
  findReplyCall: (messages: AIMessage[]) => {
    const message = messages[messages.length - 1];

    return (message?.tool_calls ?? []).find(
      (c) => c.name === TOOL.REPLY_TO_EMAIL,
    );
  },
}));

const state = (messages: AIMessage[] = []): ComposeEmailStateShape => ({
  messages,
  emailId: "",
  needsResearch: false,
  kbContext: "",
  senderContext: "",
  lastRejectedDraft: null,
});

const replyCall = (id: string) =>
  new AIMessage({
    content: "",
    tool_calls: [{ id: "call_1", name: TOOL.REPLY_TO_EMAIL, args: { id } }],
  });

describe("triage — before any model call", () => {
  it("answers a reply call with no id, never touching the model or the db", async () => {
    const result = await triage(state([new AIMessage("hi")]), {} as never);

    expect(mocks.fetchEmailById).not.toHaveBeenCalled();
    expect(mocks.getPlainModelWithConfig).not.toHaveBeenCalled();
    expect(result.emailId).toBe("");
    expect(result.messages[0].content).toContain('No email with id ""');
  });

  it("answers the dangling call by its own id when the email cannot be found", async () => {
    mocks.fetchEmailById.mockResolvedValue(null);

    const result = await triage(state([replyCall("gone")]), {} as never);

    expect(mocks.getPlainModelWithConfig).not.toHaveBeenCalled();
    expect(result.messages[0].tool_call_id).toBe("call_1");
    expect(result.messages[0].content).toContain('No email with id "gone"');
  });
});
