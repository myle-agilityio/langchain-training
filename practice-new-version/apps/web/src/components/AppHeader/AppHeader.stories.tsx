import type { Meta, StoryObj } from "@storybook/react-vite";
import { withCopilotRuntime } from "@/stories";
import { AppHeader } from ".";

const meta = {
  title: "Chrome/AppHeader",
  component: AppHeader,
  parameters: { layout: "fullscreen" },
  // ViewTabs registers the enable*Mode frontend tools, so the header needs the runtime.
  decorators: [
    withCopilotRuntime,
    (Story) => (
      <div className="bg-canvas">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
