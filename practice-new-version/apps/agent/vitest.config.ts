import path from "node:path";
import { defineConfig } from "vitest/config";

// Vitest doesn't read tsconfig.json's "paths" — mirrors "@/*": ["./src/*"] so evalite's
// *.eval.ts files can import production code (prompts/, types/, utils/) that uses "@/...".
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // evalite forces its own include ("**/*.eval.ts") and ignores this one.
    include: ["src/**/__test__/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text-summary", "html", "json-summary"],
      // Everything the unit suite could reach; the LLM-backed paths stay visible as gaps on
      // purpose — they are covered by evals, not by this suite (see CLAUDE.md rule 7).
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/__test__/**",
        "src/types/**",
        "src/prompts/**",
        "src/constants/**",
        "src/data/**",
      ],
    },
  },
});
