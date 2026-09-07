import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleEmail } from "@/stories";
import { EmailLine } from ".";

const meta = {
  title: "Tool cards/Common/EmailLine",
  component: EmailLine,
  tags: ["autodocs"],
} satisfies Meta<typeof EmailLine>;

export default meta;

type Story = StoryObj<typeof meta>;

// Resolves the id against the inbox the panel already holds (seeded for every story).
export const Resolved: Story = { args: { id: sampleEmail.id } };

export const UnknownId: Story = {
  args: { id: "0e1d2c3b-4a59-6879-8a9b-0c1d2e3f4a5b" },
};

export const UnknownIdWithFallback: Story = {
  args: { id: "0e1d2c3b", fallback: "an email that has since been deleted" },
};
