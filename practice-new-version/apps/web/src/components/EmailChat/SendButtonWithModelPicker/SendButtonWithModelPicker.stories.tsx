import type { Meta, StoryObj } from "@storybook/react-vite";
import { SendButtonWithModelPicker } from ".";

const meta = {
  title: "Chat/SendButtonWithModelPicker",
  component: SendButtonWithModelPicker,
  tags: ["autodocs"],
  args: { onClick: () => {} },
} satisfies Meta<typeof SendButtonWithModelPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

// Reads and writes the real useChatModel store (localStorage-backed), no agent needed.
export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};
