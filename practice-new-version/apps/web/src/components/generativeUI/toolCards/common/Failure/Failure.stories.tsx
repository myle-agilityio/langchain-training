import type { Meta, StoryObj } from "@storybook/react-vite";
import { Failure } from ".";

const meta = {
  title: "Tool cards/Common/Failure",
  component: Failure,
  tags: ["autodocs"],
} satisfies Meta<typeof Failure>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { text: "That email is no longer in the inbox." },
};
