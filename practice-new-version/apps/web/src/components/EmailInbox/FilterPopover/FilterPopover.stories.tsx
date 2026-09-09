import type { Meta, StoryObj } from "@storybook/react-vite";
import { EMPTY_FILTERS } from "@/utils";
import { FilterPopover } from ".";

const meta = {
  title: "Inbox/FilterPopover",
  component: FilterPopover,
  tags: ["autodocs"],
  args: {
    filters: EMPTY_FILTERS,
    onApply: () => {},
    isFiltered: false,
  },
} satisfies Meta<typeof FilterPopover>;

export default meta;

type Story = StoryObj<typeof meta>;

// Click the filter icon to open the panel.
export const Default: Story = {};

export const Active: Story = {
  args: {
    filters: { status: "unread", urgency: "high", course: "math_12" },
    isFiltered: true,
  },
};

export const Disabled: Story = { args: { disabled: true } };
