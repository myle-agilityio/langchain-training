import { Hono } from "hono";
import { z } from "zod";
import { describe, expect, it } from "vitest";

import { ERROR_CODE } from "@/errors";
import type { AppEnv } from "../../types";
import { validate } from "../validate";

const Schema = z.object({ id: z.string().min(1) });

const codeOf = async (response: Response) =>
  (await response.json()).error.code as string;

// Stands in for the real errorHandler, which is covered by its own test.
const reportCode = (error: Error) =>
  Response.json(
    { error: { code: (error as { code?: string }).code ?? "UNKNOWN" } },
    { status: 400 },
  );

const jsonApp = () => {
  const app = new Hono<AppEnv>();

  app.onError(reportCode);
  app.post("/", validate("json", Schema), (c) => c.json(c.get("valid")));

  return app;
};

const queryApp = () => {
  const app = new Hono<AppEnv>();

  app.onError(reportCode);
  app.get("/", validate("query", Schema), (c) => c.json(c.get("valid")));

  return app;
};

describe("validate — json", () => {
  it("hands the parsed body to the route", async () => {
    const response = await jsonApp().request("/", {
      method: "POST",
      body: JSON.stringify({ id: "e1" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(await response.json()).toEqual({ id: "e1" });
  });

  it("turns a body that is not JSON into a validation failure", async () => {
    const response = await jsonApp().request("/", {
      method: "POST",
      body: "not json",
      headers: { "Content-Type": "application/json" },
    });

    expect(await codeOf(response)).toBe(ERROR_CODE.VALIDATION_FAILED);
  });

  it("turns a schema mismatch into a validation failure", async () => {
    const response = await jsonApp().request("/", {
      method: "POST",
      body: JSON.stringify({ id: "" }),
      headers: { "Content-Type": "application/json" },
    });

    expect(await codeOf(response)).toBe(ERROR_CODE.VALIDATION_FAILED);
  });
});

describe("validate — query", () => {
  it("hands the parsed query to the route", async () => {
    const response = await queryApp().request("/?id=e1");

    expect(await response.json()).toEqual({ id: "e1" });
  });

  it("rejects a query the schema does not accept", async () => {
    const response = await queryApp().request("/");

    expect(await codeOf(response)).toBe(ERROR_CODE.VALIDATION_FAILED);
  });
});
