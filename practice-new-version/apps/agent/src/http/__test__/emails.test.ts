import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listEmailsSeeded, patchEmail, updateEmailsStatus } from "@/db";
import { ERROR_CODE } from "@/errors";
import { emailsApp } from "../emails";
import { errorHandler } from "../middleware";
import type { AppEnv } from "../types";

vi.mock("@/db", () => ({
  listEmailsSeeded: vi.fn(),
  patchEmail: vi.fn(),
  updateEmailsStatus: vi.fn(),
}));

const app = () => {
  const instance = new Hono<AppEnv>();

  instance.use("*", async (c, next) => {
    c.set("requestId", "req-1");
    await next();
  });
  instance.route("/api/emails", emailsApp);
  instance.onError(errorHandler);

  return instance;
};

const patchRequest = (body: unknown) =>
  app().request("/api/emails", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/emails", () => {
  it("pages with the defaults when the query says nothing", async () => {
    vi.mocked(listEmailsSeeded).mockResolvedValue({
      emails: [],
      hasNext: false,
    });

    const response = await app().request("/api/emails");

    expect(response.status).toBe(200);
    expect(listEmailsSeeded).toHaveBeenCalledWith(20, 0);
  });

  it("passes the requested page through", async () => {
    vi.mocked(listEmailsSeeded).mockResolvedValue({
      emails: [],
      hasNext: true,
    });

    const response = await app().request("/api/emails?limit=50&offset=40");

    expect(await response.json()).toEqual({ emails: [], hasNext: true });
    expect(listEmailsSeeded).toHaveBeenCalledWith(50, 40);
  });

  it("rejects a page size the schema will not allow", async () => {
    const response = await app().request("/api/emails?limit=999");

    expect(response.status).toBe(400);
    expect(listEmailsSeeded).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/emails", () => {
  it("updates one email and echoes the saved row", async () => {
    vi.mocked(patchEmail).mockResolvedValue({ id: "e1" } as never);

    const response = await patchRequest({
      id: "e1",
      patch: { status: "read" },
    });

    expect(await response.json()).toEqual({ email: { id: "e1" } });
    expect(patchEmail).toHaveBeenCalledWith("e1", { status: "read" });
  });

  it("reports a miss as EMAIL_NOT_FOUND rather than a silent null", async () => {
    vi.mocked(patchEmail).mockResolvedValue(null);

    const response = await patchRequest({
      id: "gone",
      patch: { status: "read" },
    });

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe(ERROR_CODE.EMAIL_NOT_FOUND);
  });

  it("takes the bulk branch when the body carries ids", async () => {
    vi.mocked(updateEmailsStatus).mockResolvedValue([
      { id: "a" },
      { id: "b" },
    ] as never);

    const response = await patchRequest({
      ids: ["a", "b"],
      patch: { status: "read" },
    });

    expect(await response.json()).toEqual({
      emails: [{ id: "a" }, { id: "b" }],
    });
    expect(updateEmailsStatus).toHaveBeenCalledWith(["a", "b"], "read");
    expect(patchEmail).not.toHaveBeenCalled();
  });

  it("refuses a patch that would change nothing", async () => {
    const response = await patchRequest({ id: "e1", patch: {} });

    expect(response.status).toBe(400);
    expect(patchEmail).not.toHaveBeenCalled();
  });
});
