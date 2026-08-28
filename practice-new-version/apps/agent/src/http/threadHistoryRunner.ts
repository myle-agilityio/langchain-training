import { randomUUID } from "node:crypto";
import { Observable } from "rxjs";
import {
  Client,
  type Message as LangGraphMessage,
} from "@langchain/langgraph-sdk";
import {
  InMemoryAgentRunner,
  type AgentRunnerConnectRequest,
  type AgentRunnerRunRequest,
} from "@copilotkit/runtime/v2";
import {
  EventType,
  type BaseEvent,
  type Message as AGUIMessage,
  type ToolCall,
} from "@ag-ui/client";

const toAGUIMessage = (message: LangGraphMessage): AGUIMessage | null => {
  const id = message.id ?? randomUUID();
  const content = typeof message.content === "string" ? message.content : "";

  switch (message.type) {
    case "human":
      return { id, role: "user", content };

    case "ai": {
      const toolCalls: ToolCall[] | undefined = message.tool_calls?.map(
        (call) => ({
          id: call.id ?? randomUUID(),
          type: "function",
          function: { name: call.name, arguments: JSON.stringify(call.args) },
        }),
      );

      return {
        id,
        role: "assistant",
        content: content || undefined,
        toolCalls,
      };
    }

    case "tool":
      return { id, role: "tool", toolCallId: message.tool_call_id, content };

    case "system":
      return { id, role: "system", content };

    default:
      return null;
  }
};

// InMemoryAgentRunner only replays runs it personally executed — a thread from a previous
// process lifetime (or before an agent restart) connects to nothing. This subclass falls back
// to the real history in the LangGraph checkpoint (Postgres) for any thread it hasn't seen.
export class ThreadHistoryRunner extends InMemoryAgentRunner {
  private readonly client: Client;
  private readonly knownThreadIds = new Set<string>();

  constructor(deploymentUrl: string) {
    super();
    this.client = new Client({ apiUrl: deploymentUrl });
  }

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
    let messages: AGUIMessage[] = [];

    try {
      const state = await this.client.threads.getState<{
        messages?: LangGraphMessage[];
      }>(threadId);

      messages = (state.values.messages ?? [])
        .map(toAGUIMessage)
        .filter((message): message is AGUIMessage => message !== null);
    } catch {
      // Thread doesn't exist in the graph yet (brand-new id) — surface as an empty thread.
    }

    return [
      { type: EventType.RUN_STARTED, threadId, runId },
      { type: EventType.MESSAGES_SNAPSHOT, messages },
      { type: EventType.RUN_FINISHED, threadId, runId },
    ];
  }
}
