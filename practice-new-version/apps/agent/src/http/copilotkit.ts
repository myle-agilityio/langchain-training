import {
  CopilotRuntime,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { LangGraphAgent } from "@copilotkit/runtime/langgraph";

// Talks to the graph over HTTP like any LangGraph Platform deployment would — it happens to be
// the same server this app is mounted on, via agent/langgraph.json's "http.app".
const defaultAgent = new LangGraphAgent({
  deploymentUrl:
    process.env.AGENT_URL ||
    process.env.LANGGRAPH_DEPLOYMENT_URL ||
    `http://127.0.0.1:${process.env.PORT || 8123}`,
  graphId: "inbox_assistant",
  langsmithApiKey: process.env.LANGSMITH_API_KEY || "",
});

const runtime = new CopilotRuntime({
  agents: { default: defaultAgent },
  runner: new InMemoryAgentRunner(),
  openGenerativeUI: true,
  a2ui: {
    injectA2UITool: false,
  },
});

export const copilotkitApp = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});
