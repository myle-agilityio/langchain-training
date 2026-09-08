import { Hono, type Context } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppEnv } from "../../types";
import { requestContext } from "../requestContext";

const lastLog = (): Record<string, unknown> =>
  JSON.parse(String(vi.mocked(console.log).mock.lastCall?.[0]));

// Routes answer with c.json (as the real ones do), so the context header lands on the response.
const app = (handler: (c: Context<AppEnv>) => Response) => {
  const instance = new Hono<AppEnv>();

  instance.use("*", requestContext);
  instance.get("/api/emails", handler);
  instance.onError(() => Response.json({ error: true }, { status: 500 }));

  return instance;
};

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("requestContext", () => {
  it("echoes a correlation id on the response", async () => {
    const response = await app((c) => c.json({ ok: true })).request(
      "/api/emails",
    );

    expect(response.headers.get("x-request-id")).toEqual(expect.any(String));
  });

  it("logs one line carrying the method, path, status and timing", async () => {
    await app((c) => c.json({ ok: true })).request("/api/emails");

    expect(lastLog()).toMatchObject({
      message: "http.request",
      method: "GET",
      path: "/api/emails",
      status: 200,
    });
    expect(lastLog().durationMs).toEqual(expect.any(Number));
  });

  it("still logs the timing line when the request throws", async () => {
    await app(() => {
      throw new Error("boom");
    }).request("/api/emails");

    expect(lastLog()).toMatchObject({
      message: "http.request",
      path: "/api/emails",
    });
  });

  it("gives each request its own id", async () => {
    const instance = app((c) => c.json({ ok: true }));
    const first = await instance.request("/api/emails");
    const second = await instance.request("/api/emails");

    expect(first.headers.get("x-request-id")).not.toBe(
      second.headers.get("x-request-id"),
    );
  });
});
