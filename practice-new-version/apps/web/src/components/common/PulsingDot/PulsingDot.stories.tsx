import type { Meta, StoryObj } from "@storybook/react-vite";
import { PulsingDot } from ".";

const meta = {
  title: "Common/PulsingDot",
  component: PulsingDot,
  tags: ["autodocs"],
} satisfies Meta<typeof PulsingDot>;

export default meta;

type Story = StoryObj<typeof meta>;

// "Waiting on you" — what a tool card shows while a draft sits on the approval interrupt.
export const Default: Story = {};

export const InAToolHeader: Story = {
  render: () => (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      Awaiting approval
      <PulsingDot />
    </span>
  ),
};
