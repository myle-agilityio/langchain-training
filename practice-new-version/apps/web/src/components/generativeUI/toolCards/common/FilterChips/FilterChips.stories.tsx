import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilterChips } from ".";

const meta = {
  title: "Tool cards/Common/FilterChips",
  component: FilterChips,
  tags: ["autodocs"],
} satisfies Meta<typeof FilterChips>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { filter: { status: "unread", urgency: "high", course: "math_12" } },
};

// Nothing set — the row disappears rather than showing an empty strip.
export const NoFilters: Story = { args: { filter: {} } };
