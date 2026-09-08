import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { describe, expect, it } from "vitest";

import { threadIdOf } from "@/utils";

describe("threadIdOf", () => {
  it("reads a string thread_id off configurable", () => {
    const config = {
      configurable: { thread_id: "thread-1" },
    } as LangGraphRunnableConfig;

    expect(threadIdOf(config)).toBe("thread-1");
  });

  it("is undefined when there is no config, no configurable, or no thread_id", () => {
    expect(threadIdOf()).toBeUndefined();
    expect(threadIdOf({} as LangGraphRunnableConfig)).toBeUndefined();
    expect(
      threadIdOf({ configurable: {} } as LangGraphRunnableConfig),
    ).toBeUndefined();
  });

  it("is undefined when thread_id is present but not a string", () => {
    const config = {
      configurable: { thread_id: 42 },
    } as unknown as LangGraphRunnableConfig;

    expect(threadIdOf(config)).toBeUndefined();
  });
});
