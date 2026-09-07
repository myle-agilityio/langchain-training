import type { Meta, StoryObj } from "@storybook/react-vite";
import { InboxSkeleton } from ".";

const meta = {
  title: "Inbox/InboxSkeleton",
  component: InboxSkeleton,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[360px] bg-panel">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InboxSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
