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

export const Reviewed: Story = { args: { status: "complete" } };
