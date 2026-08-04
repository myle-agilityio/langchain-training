import { Container, getContainer } from "@cloudflare/containers";

interface Env {
  AGENT_CONTAINER: DurableObjectNamespace<AgentContainer>;
  OPENAI_API_KEY: string;
  DATABASE_URL: string;
  LANGSMITH_API_KEY?: string;
  LANGSMITH_TRACING?: string;
  LANGSMITH_PROJECT?: string;
}

// Proxies to the LangGraph API server, which listens on 8000 inside the container image.
export class AgentContainer extends Container<Env> {
  defaultPort = 8000;
  sleepAfter = "10m";

  constructor(ctx: DurableObject["ctx"], env: Env) {
    super(ctx, env, {
      envVars: {
        OPENAI_API_KEY: env.OPENAI_API_KEY,
        DATABASE_URL: env.DATABASE_URL,
        LANGSMITH_API_KEY: env.LANGSMITH_API_KEY ?? "",
        LANGSMITH_TRACING: env.LANGSMITH_TRACING ?? "false",
        LANGSMITH_PROJECT: env.LANGSMITH_PROJECT ?? "",
      },
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const container = getContainer(env.AGENT_CONTAINER, "agent");
    return container.fetch(request);
  },
};
