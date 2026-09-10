import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EMPTY_FILTERS } from "@/utils";
import { InboxToolbar } from ".";

const noop = () => {};

const meta = {
  title: "Inbox/InboxToolbar",
  component: InboxToolbar,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="h-dvh bg-canvas p-3">
        <Story />
      </div>
    ),
  ],
  args: {
    isLoading: false,
    filters: EMPTY_FILTERS,
    onApplyFilters: noop,
    search: "",
    onSearchChange: noop,
  },
} satisfies Meta<typeof InboxToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

const InboxToolbarDemo = (args: ComponentProps<typeof InboxToolbar>) => {
  const [search, setSearch] = useState(args.search);

  return <InboxToolbar {...args} search={search} onSearchChange={setSearch} />;
};

export const Default: Story = {
  render: (args) => <InboxToolbarDemo {...args} />,
};

export const Loading: Story = { args: { isLoading: true } };

export const Filtered: Story = {
  args: { filters: { status: "unread", urgency: "high" } },
};
