import type { Meta, StoryObj } from "@storybook/react-vite";
import { withCopilotRuntime } from "@/stories";
import { ChatPanel } from ".";

const meta = {
  title: "Chat/ChatPanel",
  component: ChatPanel,
  parameters: { layout: "fullscreen" },
  // The chat surface, model picker and threads menu all call CopilotKit hooks.
  decorators: [
    withCopilotRuntime,
    (Story) => (
      <div className="h-dvh bg-canvas p-3">
        <div className="h-full overflow-hidden rounded-xl bg-panel">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof ChatPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

// Needs `pnpm dev:agent` for the chat itself; the toolbar renders either way.
export const Default: Story = {};
