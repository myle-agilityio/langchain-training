# Agent server (`apps/agent/src/http/index.ts`)

What's inside the "Agent server" box from the [system overview](./system-overview.md) — the Hono
app mounted onto `langgraphjs dev`, and what each route talks to. `graph` is expanded in
[Main agent graph](./main-agent-graph.md); the tables each route touches are expanded in
[Database](./database.md).

```mermaid
graph TD
    Frontend["Frontend (Vite — :3000)"]

    subgraph AgentServer["Agent server — :8123"]
        CopilotRoute["/api/copilotkit"]
        EmailsAPI["/api/emails"]
        ThreadsAPI["/api/threads"]
        KnowledgeAPI["/api/knowledge"]
        SuggestionsAPI["/api/suggestions"]
        Graph["graph"]
    end

    OpenAI["OpenAI API"]
    Postgres[("Postgres")]

    Frontend -- "CopilotKit chat" --> CopilotRoute
    Frontend -- "REST" --> EmailsAPI
    Frontend -- "REST" --> ThreadsAPI
    Frontend -- "REST" --> KnowledgeAPI
    Frontend -- "REST" --> SuggestionsAPI

    CopilotRoute -- "runs" --> Graph
    Graph --> Postgres

    EmailsAPI --> Postgres
    ThreadsAPI --> Postgres
    KnowledgeAPI -- "searchKnowledge" --> Postgres
    SuggestionsAPI -- "structured-output call,\nno graph run" --> OpenAI
```
