import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

// Reuses the app's own vite config so tests resolve "@/..." and compile JSX exactly as the app does.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ["src/**/__test__/*.test.{ts,tsx}"],
      environment: "jsdom",
      fsModuleCache: true,
      setupFiles: ["./vitest.setup.ts"],
      // CopilotKit ships a bare .css import; node can't load it unless vite transforms the package.
      server: { deps: { inline: [/@copilotkit/] } },
    },
  }),
);
