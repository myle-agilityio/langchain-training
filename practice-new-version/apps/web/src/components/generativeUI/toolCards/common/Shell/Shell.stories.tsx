import type { Meta, StoryObj } from "@storybook/react-vite";
import { Inbox } from "lucide-react";
import { Shell } from ".";

const meta = {
  title: "Tool cards/Common/Shell",
  component: Shell,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: {
    icon: Inbox,
    title: "Read inbox",
    status: "complete",
    children: "Whatever the card renders goes here.",
  },
  argTypes: {
    status: {
      control: "inline-radio",
      options: ["inProgress", "executing", "complete"],
    },
  },
} satisfies Meta<typeof Shell>;

export default meta;

type Story = StoryObj<typeof meta>;

// The frame every tool card shares — icon, title, and a status marker on the right.
export const Complete: Story = {};

export const Running: Story = { args: { status: "executing" } };
