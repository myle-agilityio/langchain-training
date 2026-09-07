import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThemeToggle } from ".";

const meta = {
  title: "Chrome/ThemeToggle",
  component: ThemeToggle,
  tags: ["autodocs"],
} satisfies Meta<typeof ThemeToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

// Flips the `dark` class on <html> — the same class the toolbar's theme switcher sets, so the
// two fight a little: use either, not both.
export const Default: Story = {};
