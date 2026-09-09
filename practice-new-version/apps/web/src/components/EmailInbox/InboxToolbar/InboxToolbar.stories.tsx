import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
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
    isRefreshing: false,
    onRefresh: noop,
    isFiltered: false,
    onOpenFilters: noop,
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

export const Refreshing: Story = { args: { isRefreshing: true } };

export const Filtered: Story = { args: { isFiltered: true } };
