import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spinner } from ".";

const meta = {
  title: "Common/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
} satisfies Meta<typeof Spinner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
};
