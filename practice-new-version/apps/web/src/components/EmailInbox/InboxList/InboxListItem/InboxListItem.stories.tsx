import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleEmails } from "@/stories";
import { InboxListItem } from ".";

const noop = () => {};

const meta = {
  title: "Inbox/InboxListItem",
  component: InboxListItem,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="@container w-[640px] bg-panel">
        <Story />
      </div>
    ),
  ],
  args: {
    email: sampleEmails[0],
    onSelect: noop,
    onToggleRead: noop,
  },
} satisfies Meta<typeof InboxListItem>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Read: Story = {
  args: { email: { ...sampleEmails[0], status: "read" } },
};

// Nothing classified yet: the rail falls back to the brand lilac and no badges show.
export const Unclassified: Story = {
  args: {
    email: {
      ...sampleEmails[0],
      classification: undefined,
    },
  },
};
