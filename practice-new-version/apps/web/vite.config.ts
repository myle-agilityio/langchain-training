import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  // This package's own .env (no VITE_ prefix required); the agent reads apps/agent/.env.
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      proxy: {
        "/api": "http://localhost:8123",
      },
    },
    define: {
      // The public Threads UI flag is DERIVED from the server-side license token, resolved at
      // build/dev time — mirrors what next.config.ts used to do. Set COPILOTKIT_LICENSE_TOKEN
      // (only) to enable Threads, do not set this flag directly.
      "import.meta.env.VITE_COPILOTKIT_THREADS_ENABLED": JSON.stringify(
        env.COPILOTKIT_LICENSE_TOKEN ? "true" : "false",
      ),
    },
  };
});
