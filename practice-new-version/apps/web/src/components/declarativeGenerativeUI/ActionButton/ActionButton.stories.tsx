import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActionButton } from ".";

const meta = {
  title: "Declarative UI/ActionButton",
  component: ActionButton,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
  args: { label: "Mark all as read", doneLabel: "Done" },
} satisfies Meta<typeof ActionButton>;

export default meta;

type Story = StoryObj<typeof meta>;

// Click it once: the button latches into its done state and stays there.
export const Default: Story = {};

export const WithCallableAction: Story = {
  args: {
    label: "Flag for follow-up",
    doneLabel: "Flagged",
    action: () => console.log("action fired"),
  },
};

// A2UI hands over a raw action descriptor, not a callback — it must not be called.
export const WithDescriptorAction: Story = {
  args: { action: { action: "markAllRead", context: [] } },
};
