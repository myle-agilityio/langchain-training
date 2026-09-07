import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pending } from ".";

const meta = {
  title: "Tool cards/Common/Pending",
  component: Pending,
  tags: ["autodocs"],
} satisfies Meta<typeof Pending>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { label: "Classifying 3 emails…" } };
