import type { Meta, StoryObj } from "@storybook/react-vite";
import { withCopilotRuntime } from "@/stories";
import { EmailChat } from ".";

const meta = {
  title: "Chat/EmailChat",
  component: EmailChat,
  parameters: { layout: "fullscreen" },
  // The real CopilotChat: needs the agent on :8123 to say anything back.
  decorators: [
    withCopilotRuntime,
    (Story) => (
      <div className="h-dvh bg-panel">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EmailChat>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
