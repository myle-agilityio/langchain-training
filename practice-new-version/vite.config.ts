import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
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
      process.env.COPILOTKIT_LICENSE_TOKEN ? "true" : "false",
    ),
  },
});
