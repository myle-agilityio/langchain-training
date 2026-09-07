import type { Preview } from "@storybook/react-vite";
import { withThemeByClassName } from "@storybook/addon-themes";
import { withProviders, withStoryFrame } from "../src/stories";

import "../src/app/globals.css";
import "./preview.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: { expanded: true, matchers: { color: /background|color$/i } },
    // The app's own tokens paint the canvas (see preview.css), so the addon's swatches would
    // only fight them.
    backgrounds: { disable: true },
  },
  decorators: [
    withStoryFrame,
    withProviders,
    // `.dark` on <html> is exactly what useSyncTheme sets in the real app.
    withThemeByClassName({
      themes: { light: "", dark: "dark" },
      defaultTheme: "light",
    }),
  ],
};

export default preview;
