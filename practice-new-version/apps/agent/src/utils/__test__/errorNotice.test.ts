import { AIMessage } from "@langchain/core/messages";
import { describe, expect, it } from "vitest";

import { AppError, ERROR_CODE, ERRORS, GENERIC_MESSAGE } from "@/errors";
import { errorNotice } from "@/utils";

describe("errorNotice", () => {
  it("returns exactly one AIMessage carrying an id", () => {
    const [message, ...rest] = errorNotice(
      new AppError(ERROR_CODE.EMAIL_NOT_FOUND),
    );

    expect(rest).toHaveLength(0);
    expect(AIMessage.isInstance(message)).toBe(true);
    expect(message.id).toEqual(expect.any(String));
  });

  it("uses the catalog's wording for an expected error", () => {
    const [message] = errorNotice(new AppError(ERROR_CODE.EMAIL_NOT_FOUND));

    expect(message.content).toBe(
      ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].userMessage,
    );
  });

  it("never lets an unexpected error describe itself", () => {
    const [message] = errorNotice(
      new AppError(ERROR_CODE.INTERNAL, { detail: "pool exhausted" }),
    );

    expect(message.content).toBe(GENERIC_MESSAGE);
    expect(message.content).not.toContain("pool exhausted");
  });
});
