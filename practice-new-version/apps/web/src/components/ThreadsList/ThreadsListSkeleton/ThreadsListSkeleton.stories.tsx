import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThreadsListSkeleton } from ".";

const meta = {
  title: "ThreadsList/ThreadsListSkeleton",
  component: ThreadsListSkeleton,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[280px] bg-panel p-1">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ThreadsListSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
