import type { Meta, StoryObj } from "@storybook/react-vite";
import { ModelPicker } from ".";

const meta = {
  title: "Chrome/ModelPicker",
  component: ModelPicker,
  tags: ["autodocs"],
} satisfies Meta<typeof ModelPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

// Reads and writes the real useChatModel store (localStorage-backed), no agent needed.
export const Default: Story = {};
