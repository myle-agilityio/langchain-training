import type { Meta, StoryObj } from "@storybook/react-vite";
import { ToastRow } from ".";

const meta = {
  title: "Common/Toast/ToastRow",
  component: ToastRow,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ToastRow>;

export default meta;

type Story = StoryObj<typeof meta>;

// Rows dismiss themselves after 6s — reload the story to see one again.
export const Error: Story = {
  args: {
    toast: {
      id: "story-error",
      tone: "error",
      message: "Can't reach the server. Check your connection.",
    },
  },
};

export const Info: Story = {
  args: {
    toast: {
      id: "story-info",
      tone: "info",
      message: "Inbox refreshed.",
    },
  },
};
