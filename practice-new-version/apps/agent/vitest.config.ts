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
});
