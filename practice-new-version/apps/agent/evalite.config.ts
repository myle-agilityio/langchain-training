import { defineConfig } from "evalite/config";

// apps/agent/.env holds GROQ_API_KEY — evals run outside langgraphjs dev, so they load it themselves.
export default defineConfig({
  setupFiles: ["dotenv/config"],
});
