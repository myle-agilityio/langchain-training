import { describe, expect, it, vi } from "vitest";

import type { ComposeEmailStateShape } from "@/types";
import { research } from "../research";

const mocks = vi.hoisted(() => ({
  searchKnowledge: vi.fn(),
  fetchEmailById: vi.fn(),
}));

vi.mock("@/rag", () => ({ searchKnowledge: mocks.searchKnowledge }));
vi.mock("@/config", () => ({
  getEmbeddingsWithConfig: vi.fn(),
}));
vi.mock("@/utils", () => ({ fetchEmailById: mocks.fetchEmailById }));

const state: ComposeEmailStateShape = {
  messages: [],
  emailId: "gone",
  needsResearch: true,
  kbContext: "",
  senderContext: "",
  lastRejectedDraft: null,
};

describe("research — before any embeddings call", () => {
  it("returns an empty context when the email no longer exists, without searching", async () => {
    mocks.fetchEmailById.mockResolvedValue(null);

    const result = await research(state, {} as never);

    expect(result).toEqual({ kbContext: "" });
    expect(mocks.searchKnowledge).not.toHaveBeenCalled();
  });
});
