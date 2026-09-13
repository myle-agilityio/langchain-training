import type { Meta, StoryObj } from "@storybook/react-vite";
import { TryAgainButton } from ".";

const meta = {
  title: "Common/TryAgainButton",
  component: TryAgainButton,
  tags: ["autodocs"],
  argTypes: { size: { control: "inline-radio", options: ["sm", "xs"] } },
  args: { onClick: () => {} },
} satisfies Meta<typeof TryAgainButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-4">
      <TryAgainButton {...args} size="sm" />
      <TryAgainButton {...args} size="xs" />
    </div>
  ),
};
