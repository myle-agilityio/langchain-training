import type { Meta, StoryObj } from "@storybook/react-vite";
import { Sparkles } from "lucide-react";
import { Button } from ".";

const meta = {
  title: "Common/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Compose reply" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "ghost", "destructive"],
    },
    size: { control: "select", options: ["default", "sm", "lg", "icon"] },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = { args: { variant: "secondary" } };

export const Outline: Story = { args: { variant: "outline" } };

export const Ghost: Story = { args: { variant: "ghost" } };

export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete conversation" },
};

export const Disabled: Story = { args: { disabled: true } };

export const WithIcon: Story = {
  args: {
    variant: "outline",
    children: (
      <>
        <Sparkles className="h-4 w-4" />
        Ask AI to draft
      </>
    ),
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Sparkles">
        <Sparkles className="h-4 w-4" />
      </Button>
    </div>
  ),
};
