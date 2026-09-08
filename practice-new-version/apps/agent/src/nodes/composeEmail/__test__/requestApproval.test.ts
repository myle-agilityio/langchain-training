import { AIMessage, ToolMessage } from "@langchain/core/messages";
import { describe, expect, it, vi } from "vitest";

import { COMPOSE_REPLY_ACTION, TOOL } from "@repo/constants";
import type { ComposeEmailStateShape } from "@/types";
import { requestApproval } from "../requestApproval";

const resume = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
const interruptArgs = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock("@langchain/langgraph", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@langchain/langgraph")>()),
  interrupt: (value: unknown) => {
    interruptArgs.current = value;

    return resume.current;
  },
}));

const replyCall = new AIMessage({
  content: "",
  tool_calls: [{ id: "call_1", name: TOOL.REPLY_TO_EMAIL, args: { id: "e1" } }],
});

const state = (
  overrides: Partial<ComposeEmailStateShape> = {},
): ComposeEmailStateShape => ({
  messages: [replyCall],
  emailId: "e1",
  needsResearch: false,
  kbContext: "",
  senderContext: "",
  draft: { subject: "Re: Missed test", body: "Wednesday works." },
  lastRejectedDraft: null,
  ...overrides,
});

describe("requestApproval", () => {
  it("shows the card the draft and the compliance verdict", async () => {
    resume.current = { decision: "approve", instruction: "sent" };

    await requestApproval(
      state({
        compliance: { compliant: false, violations: ["names a student"] },
      }),
    );

    expect(interruptArgs.current).toEqual({
      action: COMPOSE_REPLY_ACTION,
      args: {
        id: "e1",
        subject: "Re: Missed test",
        body: "Wednesday works.",
        compliance: { compliant: false, violations: ["names a student"] },
      },
    });
  });

  it("answers the dangling reply call with the teacher's instruction", async () => {
    resume.current = { decision: "approve", instruction: "Say it was sent." };

    const result = await requestApproval(state());
    const [message] = result.messages as ToolMessage[];

    expect(message.tool_call_id).toBe("call_1");
    expect(message.content).toBe("Say it was sent.");
  });

  it("clears the in-flight email so the inbox stops showing it as drafting", async () => {
    resume.current = { decision: "approve", instruction: "sent" };

    await expect(requestApproval(state())).resolves.toMatchObject({
      emailId: "",
    });
  });

  it("forgets the draft once it is approved", async () => {
    resume.current = { decision: "approve", instruction: "sent" };

    await expect(requestApproval(state())).resolves.toMatchObject({
      lastRejectedDraft: null,
    });
  });

  it("keeps the rejected draft, edits included, for a later adjustment", async () => {
    resume.current = {
      decision: "reject",
      instruction: "acknowledge",
      subject: "Re: edited",
      body: "edited body",
    };

    await expect(requestApproval(state())).resolves.toMatchObject({
      lastRejectedDraft: {
        emailId: "e1",
        subject: "Re: edited",
        body: "edited body",
      },
    });
  });

  it("falls back to the drafted text when the card sent no edits", async () => {
    resume.current = { decision: "reject", instruction: "acknowledge" };

    await expect(requestApproval(state())).resolves.toMatchObject({
      lastRejectedDraft: {
        subject: "Re: Missed test",
        body: "Wednesday works.",
      },
    });
  });

  it("answers nothing when no reply call is waiting", async () => {
    resume.current = { decision: "approve", instruction: "sent" };

    await expect(
      requestApproval(state({ messages: [] })),
    ).resolves.toMatchObject({ messages: [] });
  });
});

describe("requestApproval — a call with no id", () => {
  it('falls back to "unknown" rather than sending an undefined tool_call_id', async () => {
    resume.current = { decision: "approve", instruction: "sent" };

    const call = new AIMessage({
      content: "",
      tool_calls: [
        { id: undefined, name: TOOL.REPLY_TO_EMAIL, args: { id: "e1" } },
      ],
    });
    const result = await requestApproval(state({ messages: [call] }));
    const [message] = result.messages as ToolMessage[];

    expect(message.tool_call_id).toBe("unknown");
  });
});
