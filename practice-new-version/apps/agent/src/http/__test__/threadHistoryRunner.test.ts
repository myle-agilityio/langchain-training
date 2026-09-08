import { EventType } from "@ag-ui/client";
import { firstValueFrom, of, toArray } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getThreadMessages } from "@/db";
import { ThreadHistoryRunner } from "../threadHistoryRunner";

vi.mock("@/db", () => ({ getThreadMessages: vi.fn() }));

const superRun = vi.hoisted(() => vi.fn());
const superConnect = vi.hoisted(() => vi.fn());

vi.mock("@copilotkit/runtime/v2", () => ({
  InMemoryAgentRunner: class {
    run(request: unknown) {
      return superRun(request);
    }

    connect(request: unknown) {
      return superConnect(request);
    }
  },
}));

const events = (observable: ReturnType<ThreadHistoryRunner["connect"]>) =>
  firstValueFrom(observable.pipe(toArray()));

let runner: ThreadHistoryRunner;

beforeEach(() => {
  vi.clearAllMocks();
  runner = new ThreadHistoryRunner();
  superRun.mockReturnValue(of({ type: EventType.RUN_STARTED }));
  superConnect.mockReturnValue(of({ type: EventType.RUN_FINISHED }));
});

describe("ThreadHistoryRunner", () => {
  it("lets the in-memory runner handle a thread it executed itself", async () => {
    runner.run({ threadId: "t1" } as never);
    runner.connect({ threadId: "t1" } as never);

    expect(superConnect).toHaveBeenCalledOnce();
    expect(getThreadMessages).not.toHaveBeenCalled();
  });

  it("replays the saved transcript for a thread from a previous process", async () => {
    vi.mocked(getThreadMessages).mockResolvedValue([
      { role: "user", content: "reply to Flo" },
    ]);

    const replayed = await events(runner.connect({ threadId: "old" } as never));

    expect(superConnect).not.toHaveBeenCalled();
    expect(replayed.map((e) => e.type)).toEqual([
      EventType.RUN_STARTED,
      EventType.MESSAGES_SNAPSHOT,
      EventType.RUN_FINISHED,
    ]);
    expect((replayed[1] as { messages: unknown[] }).messages).toEqual([
      { role: "user", content: "reply to Flo" },
    ]);
  });

  it("replays an empty snapshot for a brand-new id rather than failing", async () => {
    vi.mocked(getThreadMessages).mockResolvedValue(null);

    const replayed = await events(runner.connect({ threadId: "new" } as never));

    expect((replayed[1] as { messages: unknown[] }).messages).toEqual([]);
  });

  it("carries the thread id and one run id through the replayed events", async () => {
    vi.mocked(getThreadMessages).mockResolvedValue([]);

    const replayed = await events(runner.connect({ threadId: "old" } as never));
    const [started, , finished] = replayed as {
      threadId?: string;
      runId?: string;
    }[];

    expect(started.threadId).toBe("old");
    expect(finished.runId).toBe(started.runId);
  });

  it("surfaces a failed history read to the subscriber", async () => {
    vi.mocked(getThreadMessages).mockRejectedValue(new Error("db down"));

    await expect(
      events(runner.connect({ threadId: "old" } as never)),
    ).rejects.toThrow("db down");
  });
});
