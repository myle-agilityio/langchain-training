import { describe, expect, it } from "vitest";

import { TOOL } from "@repo/constants";
import { reply_to_email } from "../replyToEmail";

describe("reply_to_email", () => {
  it("is named for the router to match on", () => {
    expect(reply_to_email.name).toBe(TOOL.REPLY_TO_EMAIL);
  });

  it("is never actually executed — the router diverts it to the compose subgraph", async () => {
    await expect(reply_to_email.invoke({ id: "e1" } as never)).resolves.toBe(
      "",
    );
  });
});
