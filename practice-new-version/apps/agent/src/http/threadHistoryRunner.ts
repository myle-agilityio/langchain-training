import { randomUUID } from "node:crypto";
import { Observable } from "rxjs";
import {
  InMemoryAgentRunner,
  type AgentRunnerConnectRequest,
  type AgentRunnerRunRequest,
} from "@copilotkit/runtime/v2";
import {
  EventType,
  type BaseEvent,
  type Message as AGUIMessage,
} from "@ag-ui/client";
import { getThreadMessages } from "@/db";

// InMemoryAgentRunner only replays runs it personally executed — a thread from a previous
// process lifetime (or before an agent restart) connects to nothing. This subclass falls back
// to the transcript this app saved to Postgres (see db/threads.ts) for any thread it hasn't seen.
export class ThreadHistoryRunner extends InMemoryAgentRunner {
  private readonly knownThreadIds = new Set<string>();

  override run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    this.knownThreadIds.add(request.threadId);

    return super.run(request);
  }

  override connect(request: AgentRunnerConnectRequest): Observable<BaseEvent> {
    if (this.knownThreadIds.has(request.threadId)) {
      return super.connect(request);
    }

    return new Observable<BaseEvent>((subscriber) => {
      this.loadHistorySnapshot(request.threadId).then(
        (events) => {
          events.forEach((event) => subscriber.next(event));
          subscriber.complete();
        },
        (error: unknown) => subscriber.error(error),
      );
    });
  }

  private async loadHistorySnapshot(threadId: string): Promise<BaseEvent[]> {
    const runId = randomUUID();
    // Saved verbatim from the frontend's agent.messages (see useSyncThreads) — already AG-UI
    // shape, no mapping needed. Null for a brand-new id, or a thread that predates this column.
    const messages = ((await getThreadMessages(threadId)) ??
      []) as AGUIMessage[];

    return [
      { type: EventType.RUN_STARTED, threadId, runId },
      { type: EventType.MESSAGES_SNAPSHOT, messages },
      { type: EventType.RUN_FINISHED, threadId, runId },
    ];
  }
}
