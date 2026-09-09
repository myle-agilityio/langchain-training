import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppLogo } from ".";

const meta = {
  title: "Chrome/AppLogo",
  component: AppLogo,
  tags: ["autodocs"],
} satisfies Meta<typeof AppLogo>;

export default meta;

type Story = StoryObj<typeof meta>;

// The gradient and the plane both flip with the theme — switch it in the toolbar to check both.
export const Default: Story = {};

// Below `sm` only the mark shows; the wordmark is dropped.
export const MarkOnly: Story = {
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
