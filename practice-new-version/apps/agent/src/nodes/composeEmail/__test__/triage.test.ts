import { AIMessage } from "@langchain/core/messages";
import { END } from "@langchain/langgraph";
import { describe, expect, it, vi } from "vitest";

import { TOOL } from "@repo/constants";
import type { ComposeEmailStateShape } from "@/types";
import { afterTriage, triage } from "../triage";

const mocks = vi.hoisted(() => ({
  getPlainModelWithConfig: vi.fn(),
  fetchEmailById: vi.fn(),
}));

vi.mock("@/config", () => ({
  getPlainModelWithConfig: mocks.getPlainModelWithConfig,
  hidden: (c: unknown) => c,
}));

vi.mock("@/utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils")>()),
  fetchEmailById: mocks.fetchEmailById,
  findReplyCall: (messages: AIMessage[]) => {
    const message = messages[messages.length - 1];

    return (message?.tool_calls ?? []).find(
      (c) => c.name === TOOL.REPLY_TO_EMAIL,
    );
  },
}));

// Only emailId and needsResearch steer the route; the rest is the state shape's baseline.
const routeState = (
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

const triageState = (messages: AIMessage[] = []): ComposeEmailStateShape => ({
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

describe("afterTriage", () => {
  it("ends the subgraph when triage matched no email", () => {
    expect(afterTriage(routeState({ emailId: "", needsResearch: true }))).toBe(
      END,
    );
  });

  it("researches first when the draft needs grounding", () => {
    expect(afterTriage(routeState({ needsResearch: true }))).toBe("research");
  });

  it("writes straight away when it does not", () => {
    expect(afterTriage(routeState({ needsResearch: false }))).toBe(
      "write_draft",
    );
  });
});

describe("triage — before any model call", () => {
  it("answers a reply call with no id, never touching the model or the db", async () => {
    await expect(
      triage(triageState([new AIMessage("hi")]), {} as never),
    ).resolves.toMatchObject({
      emailId: "",
      messages: [
        expect.objectContaining({
          content: expect.stringContaining('No email with id ""'),
        }),
      ],
    });

    expect(mocks.fetchEmailById).not.toHaveBeenCalled();
    expect(mocks.getPlainModelWithConfig).not.toHaveBeenCalled();
  });

  it("answers the dangling call by its own id when the email cannot be found", async () => {
    mocks.fetchEmailById.mockResolvedValue(null);

    await expect(
      triage(triageState([replyCall("gone")]), {} as never),
    ).resolves.toMatchObject({
      messages: [
        expect.objectContaining({
          tool_call_id: "call_1",
          content: expect.stringContaining('No email with id "gone"'),
        }),
      ],
    });

    expect(mocks.getPlainModelWithConfig).not.toHaveBeenCalled();
  });
});
