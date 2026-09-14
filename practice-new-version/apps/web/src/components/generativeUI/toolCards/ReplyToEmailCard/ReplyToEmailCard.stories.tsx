import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReplyToEmailCard } from ".";

const meta = {
  title: "Tool cards/ReplyToEmailCard",
  component: ReplyToEmailCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: { status: "complete", parameters: { id: "e1" } },
} satisfies Meta<typeof ReplyToEmailCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Drafting: Story = { args: { status: "executing" } };

export const Approved: Story = {
  args: {
    result: "The teacher approved this draft and it has been sent.",
  },
};

export const Rejected: Story = {
  args: {
    result: "The teacher rejected this draft and nothing was sent.",
  },
};

// e.g. composeEmailErrorHandler's failure text — doesn't match either known phrasing.
export const Unrecognized: Story = { args: { status: "complete" } };
