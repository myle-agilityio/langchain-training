import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettierConfig from "eslint-config-prettier";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules",
      "**/dist",
      "**/build",
      "**/.langgraph_api",
      "**/*.tsbuildinfo",
      "**/.turbo",
      "**/evalite-export",
      "**/.evalite",
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      "react-hooks":
        reactHooks.configs.flat["recommended-latest"].plugins["react-hooks"],
      "react-refresh": reactRefresh.configs.vite.plugins["react-refresh"],
    },
    rules: {
      ...reactHooks.configs.flat["recommended-latest"].rules,
      ...reactRefresh.configs.vite.rules,
      // React Compiler-era rules, still evolving — don't block on them yet
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
  prettierConfig,
  {
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      // Blank lines split a body into sections: declarations, work, return.
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "block-like", next: "*" },
        { blankLine: "always", prev: "*", next: "block-like" },
        { blankLine: "always", prev: "*", next: ["return", "throw"] },
        { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
        {
          blankLine: "any",
          prev: ["const", "let", "var"],
          next: ["const", "let", "var"],
        },
        { blankLine: "always", prev: "directive", next: "*" },
        { blankLine: "always", prev: "import", next: "*" },
        { blankLine: "any", prev: "import", next: "import" },
        // Forcing a gap between switch cases breaks empty fall-through cases.
        {
          blankLine: "any",
          prev: ["case", "default"],
          next: ["case", "default"],
        },
      ],
      // eslint-config-prettier turns curly off; we want every branch braced.
      curly: ["error", "all"],
    },
  },
);
