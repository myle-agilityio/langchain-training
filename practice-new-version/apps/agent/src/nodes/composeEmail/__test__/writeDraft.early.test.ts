import { describe, expect, it, vi } from "vitest";

import type { ComposeEmailStateShape } from "@/types";
import { writeDraft } from "../writeDraft";

const mocks = vi.hoisted(() => ({
  getPlainModelWithConfig: vi.fn(),
  getEmail: vi.fn(),
}));

vi.mock("@/config", () => ({
  getPlainModelWithConfig: mocks.getPlainModelWithConfig,
  hidden: (c: unknown) => c,
}));

vi.mock("@/db", () => ({ getEmail: mocks.getEmail }));

const state: ComposeEmailStateShape = {
  messages: [],
  emailId: "gone",
  needsResearch: false,
  kbContext: "",
  senderContext: "",
  lastRejectedDraft: null,
};

describe("writeDraft — before any model call", () => {
  it("returns nothing to update when the email no longer exists, without calling the model", async () => {
    mocks.getEmail.mockResolvedValue(null);

    const result = await writeDraft(state, {} as never);

    expect(result).toEqual({});
    expect(mocks.getPlainModelWithConfig).not.toHaveBeenCalled();
  });
});
