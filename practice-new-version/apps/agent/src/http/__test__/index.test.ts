import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { listEmailsSeeded } from "@/db";

vi.mock("@/db", () => ({
  listEmailsSeeded: vi.fn(),
  listThreads: vi.fn(),
  upsertThread: vi.fn(),
  threadExists: vi.fn(),
  renameThread: vi.fn(),
  deleteThread: vi.fn(),
  getThreadMessages: vi.fn(),
}));

// The real CopilotKit runtime constructs a LangGraphAgent and opens no connection at import
// time, but it does read env vars this test doesn't set — stub it so app.ts imports cleanly.
vi.mock("@copilotkit/runtime/v2", async () => {
  const { Hono } = await import("hono");

  return {
    CopilotRuntime: class {},
    createCopilotHonoHandler: () => {
      const stub = new Hono();

      stub.all("/api/copilotkit/*", (c) => c.text("copilotkit"));

      return stub;
    },
    InMemoryAgentRunner: class {},
  };
});

vi.mock("@copilotkit/runtime/langgraph", () => ({
  LangGraphAgent: class {},
}));

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

let app: Awaited<typeof import("../index")>["app"];

// The first import transforms the whole app graph (CopilotKit, LangGraph, axios, rxjs,
// ag-ui/client, pg...) — pay that cost once here instead of racing per-test timeouts.
beforeAll(async () => {
  ({ app } = await import("../index"));
}, 30000);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("http app", () => {
  it("mounts the emails route under /api/emails", async () => {
    vi.mocked(listEmailsSeeded).mockResolvedValue({
      emails: [],
      hasNext: false,
    });

    const response = await app.request("/api/emails");

    expect(response.status).toBe(200);
  });

  it("answers an unknown route with the catalog's not-found shape", async () => {
    const response = await app.request("/nope");
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("stamps a correlation id on every response, success or not", async () => {
    vi.mocked(listEmailsSeeded).mockResolvedValue({
      emails: [],
      hasNext: false,
    });

    const ok = await app.request("/api/emails");
    const missing = await app.request("/nope");

    expect(ok.headers.get("x-request-id")).toEqual(expect.any(String));
    expect(missing.headers.get("x-request-id")).toEqual(expect.any(String));
  });

  it("rejects a thread request with no owning browser before it reaches the db", async () => {
    const { listThreads } = await import("@/db");

    const response = await app.request("/api/threads");

    expect(response.status).toBe(400);
    expect(listThreads).not.toHaveBeenCalled();
  });
});
