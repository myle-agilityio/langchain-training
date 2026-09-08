import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppError, ERROR_CODE, ERRORS, GENERIC_MESSAGE } from "@/errors";
import type { AppEnv } from "../../types";
import { errorHandler, notFoundHandler } from "../errorHandler";

const app = (throwing?: unknown) => {
  const instance = new Hono<AppEnv>();

  instance.use("*", async (c, next) => {
    c.set("requestId", "req-7");
    await next();
  });
  instance.get("/", () => {
    throw throwing;
  });
  instance.onError(errorHandler);
  instance.notFound(notFoundHandler);

  return instance;
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("errorHandler", () => {
  it("answers an expected failure with its catalog code, wording and status", async () => {
    const response = await app(
      new AppError(ERROR_CODE.EMAIL_NOT_FOUND, { detail: "no email e1" }),
    ).request("/");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: ERROR_CODE.EMAIL_NOT_FOUND,
        message: ERRORS[ERROR_CODE.EMAIL_NOT_FOUND].userMessage,
        requestId: "req-7",
      },
    });
  });

  it("never lets an unexpected failure describe itself to the client", async () => {
    const response = await app(new Error("pool exhausted at pg.js:41")).request(
      "/",
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe(ERROR_CODE.INTERNAL);
    expect(body.error.message).toBe(GENERIC_MESSAGE);
    expect(JSON.stringify(body)).not.toContain("pool exhausted");
  });

  it("logs the failure exactly once", async () => {
    await app(new AppError(ERROR_CODE.DB_UNAVAILABLE)).request("/");

    expect(console.error).toHaveBeenCalledTimes(1);
  });
});

describe("notFoundHandler", () => {
  it("answers an unknown route with the catalog's not-found shape", async () => {
    const response = await app().request("/nope");
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe(ERROR_CODE.NOT_FOUND);
    expect(body.error.requestId).toBe("req-7");
  });
});
