import type { Meta, StoryObj } from "@storybook/react-vite";
import { withCopilotRuntime } from "@/stories";
import { ViewTabs } from ".";

const meta = {
  title: "Chrome/ViewTabs",
  component: ViewTabs,
  tags: ["autodocs"],
  // Registers the enableChatMode/enableAppMode frontend tools, so it needs the runtime.
  decorators: [withCopilotRuntime],
} satisfies Meta<typeof ViewTabs>;

export default meta;

type Story = StoryObj<typeof meta>;

// The selected tab lives in the useViewMode store, so it survives between stories.
export const Default: Story = {};
