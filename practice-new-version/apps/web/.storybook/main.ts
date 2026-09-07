import { defineMain } from "@storybook/react-vite/node";

// The app's vite.config.ts (the `@` alias, the Tailwind plugin) is picked up automatically.
export default defineMain({
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.tsx"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-themes",
    "@storybook/addon-a11y",
  ],
});
