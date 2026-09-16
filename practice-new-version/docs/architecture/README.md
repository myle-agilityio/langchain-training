# Architecture

Diagrams of the AI Email Assistant, ordered by zoom level — start at the system, then drop into
each piece it's made of. Each diagram lives in its own file:

| #   | Diagram                                                 | Covers                                                                                                    |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | [System overview](./system-overview.md)                 | Browser, agent server, Postgres, and how they talk to each other.                                         |
| 2   | [Agent server](./agent-server.md)                       | What's inside the "agent server" box above: its HTTP routes and how each one uses the graph and Postgres. |
| 3   | [Main agent graph](./main-agent-graph.md)               | What runs when a route above invokes `graph`.                                                             |
| 4   | [`compose_email` subgraph](./compose-email-subgraph.md) | What runs inside that graph's `compose_email` node.                                                       |
| 5   | [Tools available to `call_model`](./tools.md)           | What's inside that graph's `tools` node.                                                                  |
| 6   | [RAG flow](./rag-flow.md)                               | How the knowledge base behind `search_knowledge_base` gets seeded and queried.                            |
| 7   | [Frontend tools](./frontend-tools.md)                   | A separate mechanism, tools the model can call that run in the browser instead of node 5's `ToolNode`.    |
