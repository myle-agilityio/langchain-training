import { AIMessage } from "@langchain/core/messages";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AgentStateShape } from "@/types";
import { moderator } from "../moderator";

const mocks = vi.hoisted(() => ({ getPlainModelWithConfig: vi.fn() }));

vi.mock("@/config", () => ({
  getPlainModelWithConfig: mocks.getPlainModelWithConfig,
}));

const config = { configurable: { thread_id: "t1" } };

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("moderator — before any model call", () => {
  it("passes a non-human last message through without ever asking the model", async () => {
    const state: AgentStateShape = { messages: [new AIMessage("ok")] };

    await expect(moderator(state, config)).resolves.toEqual({
      blocked: false,
    });
    expect(mocks.getPlainModelWithConfig).not.toHaveBeenCalled();
  });
});
