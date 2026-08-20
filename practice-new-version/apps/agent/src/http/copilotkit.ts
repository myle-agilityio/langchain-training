import {
  CopilotRuntime,
  CopilotKitIntelligence,
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
  // --- copilotkit:intelligence (remove this block to opt out) ---
  ...(process.env.COPILOTKIT_LICENSE_TOKEN
    ? {
        intelligence: new CopilotKitIntelligence({
          apiKey: process.env.INTELLIGENCE_API_KEY ?? "",
          apiUrl: process.env.INTELLIGENCE_API_URL ?? "http://localhost:4201",
          wsUrl:
            process.env.INTELLIGENCE_GATEWAY_WS_URL ?? "ws://localhost:4401",
        }),
        // Demo stub — replace with your real auth-derived user identity before any
        // multi-user deployment, or all users share one thread history.
        identifyUser: () => ({ id: "demo-user", name: "Demo User" }),
        licenseToken: process.env.COPILOTKIT_LICENSE_TOKEN,
      }
    : { runner: new InMemoryAgentRunner() }),
  // --- /copilotkit:intelligence ---
  openGenerativeUI: true,
  a2ui: {
    injectA2UITool: false,
  },
});

export const copilotkitApp = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});
