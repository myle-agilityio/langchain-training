import type { Meta, StoryObj } from "@storybook/react-vite";
import { useComposeApproval } from "@/stores";
import { ToolBusyIndicator } from ".";

const meta = {
  title: "Tool cards/Common/ToolBusyIndicator",
  component: ToolBusyIndicator,
  tags: ["autodocs"],
} satisfies Meta<typeof ToolBusyIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

// Something is actually running.
export const Working: Story = {
  beforeEach: () => {
    useComposeApproval.setState({ awaitingApproval: false });
  },
};

// Paused on the approval interrupt: the dot reads as "waiting on you".
export const AwaitingApproval: Story = {
  beforeEach: () => {
    useComposeApproval.setState({ awaitingApproval: true });
  },
};
