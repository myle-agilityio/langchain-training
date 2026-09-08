import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { USER_ID_HEADER } from "@repo/constants";
import { ERROR_CODE } from "@/errors";
import type { AppEnv } from "../../types";
import { requireUserId } from "../requireUserId";

const app = () => {
  const instance = new Hono<AppEnv>();

  instance.onError((error) =>
    Response.json(
      {
        error: {
          code: (error as { code?: string }).code,
          detail: (error as { detail?: string }).detail,
        },
      },
      { status: 400 },
    ),
  );
  instance.get("/", requireUserId, (c) => c.json({ userId: c.get("userId") }));

  return instance;
};

describe("requireUserId", () => {
  it("passes the browser's id through to the route", async () => {
    const response = await app().request("/", {
      headers: { [USER_ID_HEADER]: "user-abc" },
    });

    expect(await response.json()).toEqual({ userId: "user-abc" });
  });

  it("refuses an unscoped request, naming the header it wanted", async () => {
    const response = await app().request("/");
    const body = await response.json();

    expect(body.error.code).toBe(ERROR_CODE.VALIDATION_FAILED);
    expect(body.error.detail).toContain(USER_ID_HEADER);
  });
});
